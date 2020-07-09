/*
 * bibliography.ts
 *
 * Copyright (C) 2020 by RStudio, PBC
 *
 * Unless you have received this program directly from RStudio pursuant
 * to the terms of a commercial license agreement with RStudio, then
 * this program is licensed to you under the terms of version 3 of the
 * GNU Affero General Public License. This program is distributed WITHOUT
 * ANY EXPRESS OR IMPLIED WARRANTY, INCLUDING THOSE OF NON-INFRINGEMENT,
 * MERCHANTABILITY OR FITNESS FOR A PARTICULAR PURPOSE. Please refer to the
 * AGPL (http://www.gnu.org/licenses/agpl-3.0.txt) for more details.
 *
 */
import { Node as ProsemirrorNode, Schema } from 'prosemirror-model';
import { Transaction } from 'prosemirror-state';
import { NodeWithPos } from 'prosemirror-utils';

import Fuse from 'fuse.js';
import { PandocServer } from './pandoc';

import { EditorUIContext, EditorUI } from './ui';
import { yamlMetadataNodes, stripYamlDelimeters, parseYaml } from './yaml';
import { expandPaths } from './path';
import { CSLName, CSLDate, CSL } from './csl';
import { urlForDOI } from './doi';

export interface BibliographyFiles {
  bibliography: string[];
}

export interface BibliographyResult {
  etag: string;
  bibliography: Bibliography;
}

export interface Bibliography {
  sources: BibliographySource[];
  project_biblios: string[];
}

// The individual bibliographic source
export interface BibliographySource extends CSL {
  id: string;
  type: string;
  DOI?: string;
  URL?: string;
  title?: string;
  author?: CSLName[];
  issued?: CSLDate;
}

interface ParsedYaml {
  yamlCode: string;
  yaml: any;
  node: NodeWithPos;
}

// The fields and weights that will indexed and searched
// when searching bibliographic sources
const kFields: Fuse.FuseOptionKeyObject[] = [
  { name: 'id', weight: 20 },
  { name: 'author.family', weight: 10 },
  { name: 'author.literal', weight: 10 },
  { name: 'author.given', weight: 1 },
  { name: 'title', weight: 1 },
  { name: 'issued', weight: 1 },
];

export class BibliographyManager {
  private readonly server: PandocServer;
  private etag: string;
  private bibliography?: Bibliography;
  private fuse: Fuse<BibliographySource, Fuse.IFuseOptions<any>> | undefined;

  public constructor(server: PandocServer) {
    this.server = server;
    this.etag = '';
  }

  public async loadBibliography(ui: EditorUI, doc: ProsemirrorNode): Promise<Bibliography> {
    // read the Yaml blocks from the document
    const parsedYamlNodes = parseYamlNodes(doc);

    // Currently edited doc
    const docPath = ui.context.getDocumentPath();

    // Gather the biblography files from the document
    const bibliographiesRelative = bibliographyFilesFromDoc(parsedYamlNodes, ui.context);
    const bibliographiesAbsolute = expandPaths(ui.context.getDefaultResourceDir(), bibliographiesRelative?.bibliography || []);

    // Gather the reference block
    const refBlock = referenceBlockFromYaml(parsedYamlNodes);

    if (docPath || bibliographiesAbsolute.length > 0 || refBlock) {
      // get the bibliography
      const result = await this.server.getBibliography(docPath, bibliographiesAbsolute, refBlock, this.etag);

      // Read bibliography data from files (via server)
      if (!this.bibliography || result.etag !== this.etag) {
        const sources = result.bibliography.sources;
        const parsedIds = sources.map(source => source.id);

        this.bibliography = result.bibliography;
        this.updateIndex(this.bibliography.sources);
      }

      // record the etag for future queries
      this.etag = result.etag;
    }

    // return sources
    return this.bibliography || { sources: [], project_biblios: [] };
  }

  public findDoiInLoadedBibliography(doi: string): BibliographySource | undefined {
    // NOTE: This will only search sources that have already been loaded.
    // Please be sure to use loadBibliography before calling this or
    // accept the risk that this will not properly search for a DOI if the
    // bibliography hasn't already been loaded.
    return this.bibliography?.sources.find(source => source.DOI === doi);
  }

  public findIdInLoadedBibliography(id: string): BibliographySource | undefined {
    // NOTE: This will only search sources that have already been loaded.
    // Please be sure to use loadBibliography before calling this or
    // accept the risk that this will not properly search for a DOI if the
    // bibliography hasn't already been loaded.
    return this.bibliography?.sources.find(source => source.id === id);
  }

  public findCiteId(citeId: string): BibliographySource | undefined {
    return this.bibliography?.sources.find(source => source.id === citeId);
  }

  public searchInLoadedBibliography(query: string, limit: number): BibliographySource[] {
    // NOTE: This will only search sources that have already been loaded.
    // Please be sure to use loadBibliography before calling this or
    // accept the risk that this will not properly search for a source if the
    // bibliography hasn't already been loaded.
    if (this.fuse) {
      const options = {
        isCaseSensitive: false,
        shouldSort: true,
        includeMatches: false,
        includeScore: false,
        limit,
        keys: kFields,
      };
      const results: Fuse.FuseResult<BibliographySource>[] = this.fuse.search(query, options);
      return results.map((result: { item: any }) => result.item);
    } else {
      return [];
    }
  }

  public urlForSource(source: BibliographySource): string | undefined {
    if (source.URL) {
      return source.URL;
    } else if (source.DOI) {
      return urlForDOI(source.DOI);
    }
  }

  private updateIndex(bibSources: BibliographySource[]) {
    // build search index
    const options = {
      keys: kFields.map(field => field.name),
    };
    const index = Fuse.createIndex(options.keys, bibSources);
    this.fuse = new Fuse(bibSources, options, index);
  }
}

function referenceBlockFromYaml(parsedYamls: ParsedYaml[]): string {
  const refBlockParsedYamls = parsedYamls.filter(
    parsedYaml => parsedYaml.yaml !== null && typeof parsedYaml.yaml === 'object' && parsedYaml.yaml.references,
  );

  // Pandoc will use the last references node when generating a bibliography.
  // So replicate this and use the last biblography node that we find
  if (refBlockParsedYamls.length > 0) {
    const lastReferenceParsedYaml = refBlockParsedYamls[refBlockParsedYamls.length - 1];
    if (lastReferenceParsedYaml) {
      return lastReferenceParsedYaml.yamlCode;
    }
  }

  return '';
}

export function bibliographyPaths(ui: EditorUI, doc: ProsemirrorNode): BibliographyFiles | null {
  // Gather the files from the document
  return bibliographyFilesFromDoc(parseYamlNodes(doc), ui.context);
}

function parseYamlNodes(doc: ProsemirrorNode): ParsedYaml[] {
  const yamlNodes = yamlMetadataNodes(doc);

  const parsedYamlNodes = yamlNodes.map<ParsedYaml>(node => {
    const yamlText = node.node.textContent;
    const yamlCode = stripYamlDelimeters(yamlText);
    return { yamlCode, yaml: parseYaml(yamlCode), node };
  });
  return parsedYamlNodes;
}

function bibliographyFilesFromDoc(parsedYamls: ParsedYaml[], uiContext: EditorUIContext): BibliographyFiles | null {
  const bibliographyParsedYamls = parsedYamls.filter(
    parsedYaml => parsedYaml.yaml !== null && typeof parsedYaml.yaml === 'object' && parsedYaml.yaml.bibliography,
  );

  // Look through any yaml nodes to see whether any contain bibliography information
  if (bibliographyParsedYamls.length > 0) {
    // Pandoc will use the last biblography node when generating a bibliography.
    // So replicate this and use the last biblography node that we find
    const bibliographyParsedYaml = bibliographyParsedYamls[bibliographyParsedYamls.length - 1];
    const bibliographyFiles = bibliographyParsedYaml.yaml.bibliography;

    if (
      Array.isArray(bibliographyFiles) &&
      bibliographyFiles.every(bibliographyFile => typeof bibliographyFile === 'string')) {
      return {
        bibliography: bibliographyFiles,
      };
    } else {
      // A single bibliography
      return {
        bibliography: [bibliographyFiles],
      };
    }
  }
  return null;
}

export function cslFromDoc(doc: ProsemirrorNode): string | undefined {

  // read the Yaml blocks from the document
  const parsedYamlNodes = parseYamlNodes(doc);

  const cslParsedYamls = parsedYamlNodes.filter(
    parsedYaml => parsedYaml.yaml !== null && typeof parsedYaml.yaml === 'object' && parsedYaml.yaml.csl,
  );

  // Look through any yaml nodes to see whether any contain csl information
  if (cslParsedYamls.length > 0) {

    // Pandoc uses the last csl block (whether or not it shares a yaml block with the
    // bibliographies element that pandoc will ultimately use) so just pick the last csl
    // block.
    const cslParsedYaml = cslParsedYamls[cslParsedYamls.length - 1];
    const cslFile = cslParsedYaml.yaml.csl;
    return cslFile;
  }
  return undefined;
}

export function ensureBibliographyFileForDoc(tr: Transaction, bibliographyFile: string, ui: EditorUI) {

  // read the Yaml blocks from the document
  const parsedYamlNodes = parseYamlNodes(tr.doc);

  // Gather the biblography files from the document
  const bibliographiesRelative = bibliographyFilesFromDoc(parsedYamlNodes, ui.context);
  if (bibliographiesRelative && bibliographiesRelative?.bibliography.length > 0) {
    // The user selected bibliography is already in the document OR
    // There is a bibliography entry, but it doesn't include the user
    // selected bibliography. In either case, we're not going to write
    // a bibliography entry to any YAML node. 
    return bibliographiesRelative.bibliography.includes(bibliographyFile);
  } else {
    // There aren't any bibliographies declared for this document yet either because
    // there are no yaml metadata blocks or the yaml metadata blocks that exist omit
    // the bibliography property
    if (parsedYamlNodes.length === 0) {
      // There aren't any yaml nodes in this document, need to create one
      const biblioNode = createBiblographyYamlNode(tr.doc.type.schema, bibliographyFile);
      tr.insert(1, biblioNode);

    } else {

      // We found at least one node in the document, add to the first node that we found
      const firstBlock = parsedYamlNodes[0];
      const updatedNode = addBibliographyToYamlNode(tr.doc.type.schema, bibliographyFile, firstBlock);
      tr.replaceRangeWith(firstBlock.node.pos, firstBlock.node.pos + firstBlock.node.node.nodeSize, updatedNode);

    }
    return true;
  }
}

const kSpaceOrColonRegex = /[\s:]/;
function bibliographyLine(bibliographyFile: string): string {
  const sketchyCharMatch = bibliographyFile.match(kSpaceOrColonRegex);
  if (sketchyCharMatch) {
    return `bibliography: "${bibliographyFile}"\n`;
  } else {
    return `bibliography: ${bibliographyFile}\n`;
  }
}

function addBibliographyToYamlNode(schema: Schema, bibliographyFile: string, parsedYaml: ParsedYaml) {
  // Add this to the first node
  const yamlCode = parsedYaml.yamlCode;
  const yamlWithBib = `---${yamlCode}${bibliographyLine(bibliographyFile)}---`;
  const yamlText = schema.text(yamlWithBib);
  return schema.nodes.yaml_metadata.create({}, yamlText);
}

function createBiblographyYamlNode(schema: Schema, bibliographyFile: string) {
  const yamlText = schema.text(`---${bibliographyLine(bibliographyFile)}---`);
  return schema.nodes.yaml_metadata.create({}, yamlText);
}

