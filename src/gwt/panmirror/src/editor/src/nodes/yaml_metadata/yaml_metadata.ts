/*
 * yaml_metadata.ts
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
import { EditorState, Transaction } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import { setTextSelection } from 'prosemirror-utils';

import { Extension } from '../../api/extension';
import { PandocOutput, PandocTokenType } from '../../api/pandoc';
import { EditorUI } from '../../api/ui';
import { ProsemirrorCommand, EditorCommandId } from '../../api/command';
import { canInsertNode } from '../../api/node';
import { codeNodeSpec } from '../../api/code';
import { selectionIsBodyTopLevel } from '../../api/selection';
import { yamlMetadataTitlePlugin } from './yaml_metadata-title';
import { yamlMetadataBlockCapsuleFilter } from './yaml_metadata-capsule';

const extension: Extension = {
  nodes: [
    {
      name: 'yaml_metadata',

      spec: {
        ...codeNodeSpec(),
        attrs: {
          navigation_id: { default: null },
        },
        parseDOM: [
          {
            tag: "div[class*='yaml-block']",
            preserveWhitespace: 'full',
          },
        ],
        toDOM(node: ProsemirrorNode) {
          return ['div', { class: 'yaml-block pm-code-block' }, 0];
        },
      },

      code_view: {
        lang: () => 'yaml-frontmatter',
        classes: ['pm-metadata-background-color', 'pm-yaml-metadata-block'],
      },

      pandoc: {
        blockCapsuleFilter: yamlMetadataBlockCapsuleFilter(),

        writer: (output: PandocOutput, node: ProsemirrorNode) => {
          output.writeToken(PandocTokenType.Para, () => {
            output.writeRawMarkdown(node.content);
          });
        },
      },
    },
  ],

  commands: (_schema: Schema, ui: EditorUI) => {
    return [new YamlMetadataCommand()];
  },

  plugins: () => [yamlMetadataTitlePlugin()],
};

class YamlMetadataCommand extends ProsemirrorCommand {
  constructor() {
    super(
      EditorCommandId.YamlMetadata,
      [],
      (state: EditorState, dispatch?: (tr: Transaction) => void, view?: EditorView) => {
        const schema = state.schema;

        if (!canInsertNode(state, schema.nodes.yaml_metadata)) {
          return false;
        }

        // only allow inserting at the top level
        if (!selectionIsBodyTopLevel(state.selection)) {
          return false;
        }

        // create yaml metadata text
        if (dispatch) {
          const tr = state.tr;
          const kYamlLeading = '---\n';
          const kYamlTrailing = '\n---';
          const yamlText = schema.text(kYamlLeading + kYamlTrailing);
          const yamlNode = schema.nodes.yaml_metadata.create({}, yamlText);
          tr.replaceSelectionWith(yamlNode);
          setTextSelection(tr.mapping.map(state.selection.from) - kYamlTrailing.length - 1)(tr);
          dispatch(tr);
        }

        return true;
      },
    );
  }
}

export default extension;
