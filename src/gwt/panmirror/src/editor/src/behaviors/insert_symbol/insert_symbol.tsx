/*
 * insert_symbol.tsx
 *
 * Copyright (C) 2019-20 by RStudio, PBC
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

import { Schema } from 'prosemirror-model';
import { EditorState, Transaction, Plugin, PluginKey } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';

import React from 'react';
import ReactDOM from 'react-dom';

import { ProsemirrorCommand, EditorCommandId } from '../../api/command';
import { applyStyles } from '../../api/css';
import { EditorEvents } from '../../api/events';
import { Extension } from '../../api/extension';
import { EditorFormat } from '../../api/format';
import { canInsertNode } from '../../api/node';
import { EditorOptions } from '../../api/options';
import { PandocExtensions } from '../../api/pandoc';
import { PandocCapabilities } from '../../api/pandoc_capabilities';
import { EditorUI } from '../../api/ui';

import { InsertSymbolPopup } from './insert_symbol-popup';
import { ScrollEvent } from '../../api/event-types';

const key = new PluginKey<boolean>('insert-symbol');
const kMinimumPanelPaddingToEdgeOfView = 5;

const extension = (
  _pandocExtensions: PandocExtensions,
  _pandocCapabilities: PandocCapabilities,
  ui: EditorUI,
  _format: EditorFormat,
  _options: EditorOptions,
  events: EditorEvents,
): Extension => {
  return {
    commands: () => {
      return [new ProsemirrorCommand(EditorCommandId.Symbol, [], insertSymbol)];
    },
    plugins: (_schema: Schema) => {
      return [new InsertSymbolPlugin(ui, events)];
    },
  };
};

export function insertSymbol(state: EditorState, dispatch?: (tr: Transaction) => void, view?: EditorView) {
  if (!isEnabled(state)) {
    return false;
  }

  if (dispatch && view) {
    const plugin = key.get(state) as InsertSymbolPlugin;
    plugin.showPopup(view);
  }
  return true;
}

function isEnabled(state: EditorState) {
  return canInsertNode(state, state.schema.nodes.text);
}

class InsertSymbolPlugin extends Plugin<boolean> {
  private readonly scrollUnsubscribe: VoidFunction;
  private readonly ui: EditorUI;
  private popup: HTMLElement | null = null;

  constructor(ui: EditorUI, events: EditorEvents) {
    super({
      key,
      view: () => ({
        update: () => {
          this.closePopup();
        },
        destroy: () => {
          this.closePopup();
          this.scrollUnsubscribe();
          window.document.removeEventListener('focusin', this.focusChanged);
        },
      }),
    });

    this.ui = ui;
    this.closePopup = this.closePopup.bind(this);
    this.scrollUnsubscribe = events.subscribe(ScrollEvent, this.closePopup);

    this.focusChanged = this.focusChanged.bind(this);
    window.document.addEventListener('focusin', this.focusChanged);
  }

  public showPopup(view: EditorView) {
    if (!this.popup) {
      const kHeight = 316;
      const kWidth = 370;

      this.popup = window.document.createElement('div');
      this.popup.tabIndex = 0;
      this.popup.style.position = 'absolute';
      this.popup.style.zIndex = '1000';

      applyStyles(this.popup, [], this.panelPositionStylesForCurrentSelection(view, kHeight, kWidth));
      ReactDOM.render(this.insertSymbolPopup(view, [kHeight, kWidth]), this.popup);
      window.document.body.appendChild(this.popup);
    }
  }
  
  private panelPositionStylesForCurrentSelection(view: EditorView, height: number, width: number) {
    const selection = view.state.selection;
    const editorRect = view.dom.getBoundingClientRect();
  
    const selectionCoords = view.coordsAtPos(selection.from);
  
    const maximumTopPosition = Math.min(selectionCoords.bottom, window.innerHeight - height - kMinimumPanelPaddingToEdgeOfView);
    const minimumTopPosition = editorRect.y;
    const popupTopPosition = Math.max(minimumTopPosition, maximumTopPosition);
  
    const maximumLeftPosition = Math.min(selectionCoords.right, window.innerWidth - width - kMinimumPanelPaddingToEdgeOfView);
    const minimumLeftPosition = editorRect.x;
    const popupLeftPosition = Math.max(minimumLeftPosition, maximumLeftPosition);

    // styles we'll return
    const styles = { 
      top: popupTopPosition + 'px',
      left: popupLeftPosition + 'px',
    };
  
    return styles;
  }

  private focusChanged() {
    if (window.document.activeElement !== this.popup && !this.popup?.contains(window.document.activeElement)) {
      this.closePopup();
    }
  }

  private closePopup() {
    if (this.popup) {
      ReactDOM.unmountComponentAtNode(this.popup);
      this.popup.remove();
      this.popup = null;
    }
  }

  private insertSymbolPopup(view: EditorView, size: [number, number]) {
    const insertText = (text: string) => {
      const tr = view.state.tr;
      tr.insertText(text);
      view.dispatch(tr);
      view.focus();
    };

    const closePopup = () => {
      this.closePopup();
      view.focus();
    };

    return (
      <InsertSymbolPopup
        onClose={closePopup}
        onInsertText={insertText}
        enabled={isEnabled(view.state)}
        size={size}
        searchImage={this.ui.images.search}
      />
    );
  }
}

export default extension;
