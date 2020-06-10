/*
 * completion.ts
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

import { Selection } from "prosemirror-state";
import { Node as ProsemirrorNode, Schema  } from "prosemirror-model";

export interface CompletionResult<T = any> {
  pos: number;
  completions: Promise<T[]>;
}

export interface CompletionHandler<T = any> {

  // return a set of completions for the given context. text is the text before
  // before the cursor in the current node (but no more than 500 characters)
  completions(text: string, selection: Selection): CompletionResult | null;
  
  // provide a completion replacement as a string or node
  replacement(schema: Schema, completion: T) : string | ProsemirrorNode;

  // completion view
  view: {
    // react compontent type for viewing the item
    component: React.FC<T> | React.ComponentClass<T>;

    key: (completion: T) => any;

    // width of completion popup (defaults to 180)
    width?: number;

    // height for completion items (defaults to 22px)
    itemHeight?: number;
 
    // maximum number of visible items (defaults to 10)
    maxVisible?: number;
  };
}



