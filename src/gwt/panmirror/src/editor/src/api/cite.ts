/*
 * cite.ts
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

import { CSLName, CSLDate, CSL } from "./csl";
import { EditorUI } from "./ui";
import { InsertCiteProps, InsertCiteUI } from "./ui-dialogs";
import { urlForDOI } from "./doi";

const kInvalidCiteKeyChars = /[\s@',\\\#}{~%&\$\^_]/g;
const kCiteIdLeadingLength = 8;

// Suggests a bibliographic identifier based upon the source
export function suggestCiteId(existingIds: string[], csl: CSL) {

  const author = csl.author;
  const issued = csl.issued;

  // Try to get the last name
  let citeIdLeading = '';
  if (author && author.length > 0) {
    if (author[0].family) {
      citeIdLeading = author[0].family;
    } else if (author[0].literal) {
      citeIdLeading = author[0].literal;
    }
  }

  // If we can't use author information, try using short title,
  // the title, or perhaps the type to construct a leading part of the 
  // citeId.
  if (citeIdLeading.length === 0) {
    const shortTitle = csl["short-title"];
    if (shortTitle && shortTitle?.length > 0) {
      citeIdLeading = shortTitle.substr(0, Math.min(kCiteIdLeadingLength, shortTitle.length));
    } else if (csl.title) {
      citeIdLeading = csl.title.substr(0, Math.min(kCiteIdLeadingLength, csl.title.length));
    } else {
      citeIdLeading = csl.type;
    }
  }

  // Try to get the publication year
  let datePart = '';
  if (issued && issued['date-parts'] && issued['date-parts'].length > 0) {
    const yearIssued = issued['date-parts'][0][0];
    // Sometimes, data arrives with a null value, ignore null
    if (yearIssued) {
      datePart = yearIssued + '';
    }
  }

  // Create a deduplicated string against the existing entries
  let baseId = `${citeIdLeading.toLowerCase()}${datePart}`;

  if (baseId.length === 0) {
    // Could try title
  }

  // Strip any characters that shouldn't appear in a bibtex citekey
  baseId = baseId.replace(kInvalidCiteKeyChars, '');

  let proposedId = baseId;
  let count = 0;

  // If there is a conflict with an existing id, we will append
  // the following character and try again. If the conflict continues with
  // the postfix character added, we'll increment and keep going through the 
  // alphabet
  const disambiguationStartCharacter = 97; // a

  while (existingIds.includes(proposedId)) {
    // If we've wrapped around to a and we haven't found a unique entry
    // Add an 'a' to the end and try again. Will ultimately create an entry like
    // Teague2012aaaf
    if (count !== 0 && count % 26 === 0) {
      baseId = baseId + String.fromCharCode(disambiguationStartCharacter);
    }

    const postfix = String.fromCharCode(disambiguationStartCharacter + (count % 26));
    proposedId = baseId + postfix;
    count++;
  }
  return proposedId;
}

export function imageForType(ui: EditorUI, type: string): [string?, string?] {
  switch (type) {
    case 'article':
    case 'article-journal':
    case 'article-magazine':
    case 'article-newspaper':
    case 'paper-conference':
    case 'review':
    case 'review-book':
    case 'techreport':
      return [ui.images.citations?.article, ui.images.citations?.article_dark];
    case 'bill':
    case 'legislation':
    case 'legal_case':
    case 'patent':
    case 'treaty':
      return [ui.images.citations?.legal, ui.images.citations?.legal_dark];
    case 'book':
    case 'booklet':
    case 'chapter':
    case 'inbook':
    case 'incollection':
    case 'manuscript':
    case 'manual':
    case 'thesis':
    case 'masterthesis':
    case 'phdthesis':
      return [ui.images.citations?.book, ui.images.citations?.book_dark];
    case 'broadcast':
      return [ui.images.citations?.broadcast, ui.images.citations?.broadcast_dark];
    case 'data':
    case 'data-set':
      return [ui.images.citations?.data, ui.images.citations?.data_dark];
    case 'entry':
    case 'entry-dictionary':
    case 'entry-encyclopedia':
      return [ui.images.citations?.entry, ui.images.citations?.entry_dark];
    case 'figure':
    case 'graphic':
      return [ui.images.citations?.image, ui.images.citations?.image_dark];
    case 'map':
      return [ui.images.citations?.map, ui.images.citations?.map_dark];
    case 'motion_picture':
      return [ui.images.citations?.movie, ui.images.citations?.movie_dark];
    case 'musical_score':
    case 'song':
      return [ui.images.citations?.song, ui.images.citations?.song_dark];
    case 'post':
    case 'post-weblog':
    case 'webpage':
      return [ui.images.citations?.web, ui.images.citations?.web_dark];
    case 'conference':
    case 'inproceedings':
    case 'proceedings':
    case 'interview':
    case 'pamphlet':
    case 'personal_communication':
    case 'report':
    case 'speech':
    case 'misc':
    case 'unpublished':
    default:
      return [ui.images.citations?.other, ui.images.citations?.other_dark];
  }
}

export interface CiteField {
  name: string;
  value: string;
}

export function urlForCitation(csl: CSL): string | undefined {
  if (csl.URL) {
    return csl.URL;
  } else if (csl.DOI) {
    return urlForDOI(csl.DOI);
  }
}

export function formatForPreview(csl: CSL): CiteField[] {

  const pairs = new Array<CiteField>();
  if (csl.title) {
    pairs.push({ name: "Title", value: csl.title });
  }
  pairs.push({ name: "Authors", value: formatAuthors(csl.author, 255) });
  if (csl.issued && isValidDate(csl.issued)) {
    pairs.push({ name: "Issue Date", value: formatIssuedDate(csl.issued) });
  }

  const containerTitle = csl["container-title"];
  if (containerTitle) {
    pairs.push({ name: "Publication", value: containerTitle });
  }

  const volume = csl.volume;
  if (volume) {
    pairs.push({ name: "Volume", value: volume });
  }

  const page = csl.page;
  if (page) {
    pairs.push({ name: "Page(s)", value: page });
  }

  const cslAny = csl as { [key: string]: any };
  Object.keys(csl).forEach(key => {
    if (!kFilteredFields.includes(key)) {
      const value = cslAny[key];
      // Don't display complex fields or fields that aren't strings
      if (typeof value === 'string') {
        // Capitalize preview names
        const name = key.charAt(0).toUpperCase() + key.slice(1);
        pairs.push({ name, value });
      }
    }
  });

  return pairs;
}

const kFilteredFields = [
  "id",
  "title",
  "author",
  "issued",
  "container-title",
  "volume",
  "page",
  "abstract",
  "provider"
];

// Sometimes, data arrives with a null value
// This function will validate that the year (required) doesn't
// contain null
function isValidDate(date: CSLDate): boolean {
  const dateParts = date["date-parts"];
  if (dateParts) {
    const invalidElement = dateParts.find(
      datePart => datePart[0] === null
    );
    return invalidElement === undefined;
  }
  return true;
}

// TODO: Needs to support localization of the templated strings
const kEtAl = 'et al.';
export function formatAuthors(authors?: CSLName[], maxLength?: number): string {
  // No author(s) specified
  if (!authors) {
    return '';
  }

  return authors
    .map(author => {
      if (author.literal?.length) {
        return author.literal;
      } else if (author.given?.length && author.family?.length) {
        // Family and Given name
        return `${author.family}, ${author.given.substring(0, 1)}`;
      } else if (author.family?.length) {
        // Family name only
        return `${author.family}`;
      } else {
        return '';
      }
    })
    .reduce((previous, current, index, array) => {
      // Ignore any additional authors if the string
      // exceeds the maximum length
      if ((maxLength && previous.length >= maxLength) || previous.endsWith(kEtAl)) {
        return previous;
      }

      if (index === 0) {
        // Too long, truncate
        if (maxLength && current.length > maxLength) {
          return `${current.substring(0, maxLength - 1)}…`;
        }
        // The first author
        return current;
      } else if (index > 0 && index === array.length - 1) {
        // The last author
        return addAuthorOrEtAl(previous, `${previous}, and ${current}`, maxLength);
      } else {
        // Middle authors
        return addAuthorOrEtAl(previous, `${previous}, ${current}`, maxLength);
      }
    });
}

function addAuthorOrEtAl(previousAuthorStr: string, newAuthorStr: string, maxLength?: number) {
  // if adding the string would make it too long, truncate
  if (maxLength && newAuthorStr.length > maxLength) {
    return etAl(previousAuthorStr, maxLength);
  }
  return newAuthorStr;
}

function etAl(authorStr: string, maxLength: number) {
  // First try just using et al., then shorten existing
  // author to accomodate
  const etAlStr = `${authorStr} ${kEtAl}`;
  if (maxLength && etAlStr.length > maxLength) {
    // First try to truncate to a space
    const lastSpace = authorStr.lastIndexOf(' ');
    if (lastSpace) {
      return `${authorStr.substr(0, lastSpace)} ${kEtAl}`;
    } else {
      // As a last resort, truncate with ellipsis
      const excessLength = etAlStr.length - maxLength - 1;
      return `${authorStr.substr(0, authorStr.length - excessLength)}… ${kEtAl}`;
    }
  }
  return etAlStr;
}

// TODO: Needs to support localization of the templated strings
export function formatIssuedDate(date: CSLDate | undefined): string {
  // No issue date for this
  if (!date) {
    return '';
  }

  const dateParts = date['date-parts'];
  if (dateParts) {
    switch (dateParts.length) {
      // There is a date range
      case 2:
        return `${dateParts[0][0]}-${dateParts[1][0]}`;
      // Only a single date
      case 1:
        return `${dateParts[0][0]}`;

      // Seems like a malformed date :(
      case 0:
      default:
        return '';
    }
  }
  return '';
}

export function citeUI(citeProps: InsertCiteProps): InsertCiteUI {
  if (citeProps.csl) {
    const suggestedId = suggestCiteId(citeProps.existingIds, citeProps.csl);
    const previewFields = formatForPreview(citeProps.csl);
    return {
      suggestedId,
      previewFields
    };
  } else {
    // This should never happen - this function should always be called with a work
    return {
      suggestedId: "",
      previewFields: []
    };
  }
}
