/*
 * VisualModeChunks.java
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
package org.rstudio.studio.client.workbench.views.source.editors.text.visualmode;

import java.util.ArrayList;

import org.rstudio.core.client.Debug;
import org.rstudio.core.client.files.FileSystemItem;
import org.rstudio.studio.client.RStudioGinjector;
import org.rstudio.studio.client.common.filetypes.FileTypeRegistry;
import org.rstudio.studio.client.panmirror.ui.PanmirrorUIChunkEditor;
import org.rstudio.studio.client.panmirror.ui.PanmirrorUIChunks;
import org.rstudio.studio.client.workbench.views.source.editors.text.AceEditor;
import org.rstudio.studio.client.workbench.views.source.editors.text.CompletionContext;
import org.rstudio.studio.client.workbench.views.source.editors.text.TextEditingTargetPrefsHelper;
import org.rstudio.studio.client.workbench.views.source.editors.text.ace.AceEditorNative;
import org.rstudio.studio.client.workbench.views.source.model.DocUpdateSentinel;

import com.google.gwt.dom.client.DivElement;
import com.google.gwt.dom.client.Document;
import com.google.gwt.event.shared.HandlerRegistration;

import jsinterop.base.Js;

public class VisualModeChunks
{
   public VisualModeChunks(DocUpdateSentinel sentinel, CompletionContext rCompletionContext)
   {
      rContext_ = rCompletionContext;
      sentinel_ = sentinel;
   }

   public PanmirrorUIChunks uiChunks()
   {
      PanmirrorUIChunks chunks = new PanmirrorUIChunks();
      chunks.createChunkEditor = (type) -> {

         // only know how to create ace instances right now
         if (!type.equals("ace"))
         {
            Debug.logToConsole("Unknown chunk editor type: " + type);
            return null;
         }
         
         PanmirrorUIChunkEditor chunk = new PanmirrorUIChunkEditor();
         
         final ArrayList<HandlerRegistration> releaseOnDismiss = new ArrayList<HandlerRegistration>();

         // Create a new AceEditor instance and allow access to the underlying
         // native JavaScript object it represents (AceEditorNative)
         final AceEditor editor = new AceEditor();
         final AceEditorNative chunkEditor = editor.getWidget().getEditor();
         chunk.editor = Js.uncheckedCast(chunkEditor);

         // Forward the R completion context from the parent editing session
         editor.setRCompletionContext(rContext_);

         // Provide the editor's container element; in the future this will be a
         // host element which hosts chunk output
         DivElement ele = Document.get().createDivElement();
         ele.appendChild(chunkEditor.getContainer());
         chunk.element = ele;
         
         // Provide a callback to set the file's mode; this needs to happen in
         // GWT land since the editor accepts GWT-flavored Filetype objects
         chunk.setMode = (String mode) ->
         {
            setMode(editor, mode);
         };
         
         // Register pref handlers, so that the new editor instance responds to
         // changes in preference values
         TextEditingTargetPrefsHelper.registerPrefs(
               releaseOnDismiss, 
               RStudioGinjector.INSTANCE.getUserPrefs(), 
               null,  // Project context
               editor, 
               new TextEditingTargetPrefsHelper.PrefsContext() 
               {
                   @Override
                   public FileSystemItem getActiveFile()
                   {
                      String path = sentinel_.getPath();
                      if (path != null)
                         return FileSystemItem.createFile(path);
                      else
                         return null;
                   }
               },
               TextEditingTargetPrefsHelper.PrefsSet.Embedded);
         
         // Register callback to be invoked when the editor instance is
         // destroyed; we use this opportunity to clean up pref handlers so they
         // aren't attached to a dead editor instance
         chunk.destroy = () ->
         {
            for (HandlerRegistration reg: releaseOnDismiss)
            {
               reg.removeHandler();
            }
         };
         
         // Prevent tab from advancing into editor
         chunkEditor.getTextInputElement().setTabIndex(-1);

         // Allow the editor's size to be determined by its content (these
         // settings trigger an auto-growing behavior), up to a max of 1000
         // lines.
         chunkEditor.setMaxLines(1000);
         chunkEditor.setMinLines(1);

         // Turn off line numbers as they're not helpful in chunks
         chunkEditor.getRenderer().setShowGutter(false);
         
         return chunk;
      };
      return chunks;
   }
   
   private void setMode(AceEditor editor, String mode)
   {
      switch(mode)
      {
      case "r":
         editor.setFileType(FileTypeRegistry.R);
         break;
      case "python":
         editor.setFileType(FileTypeRegistry.PYTHON);
         break;
      case "js":
      case "javascript":
         editor.setFileType(FileTypeRegistry.JS);
         break;
      case "tex":
      case "latex":
         editor.setFileType(FileTypeRegistry.TEX);
         break;
      case "c":
         editor.setFileType(FileTypeRegistry.C);
         break;
      case "cpp":
         editor.setFileType(FileTypeRegistry.CPP);
         break;
      case "sql":
         editor.setFileType(FileTypeRegistry.SQL);
         break;
      case "yaml":
      case "yaml-frontmatter":
         editor.setFileType(FileTypeRegistry.YAML);
         break;
      case "java":
         editor.setFileType(FileTypeRegistry.JAVA);
         break;
      case "html":
         editor.setFileType(FileTypeRegistry.HTML);
         break;
      case "shell":
      case "bash":
         editor.setFileType(FileTypeRegistry.SH);
         break;
      case "theorem":
      case "lemma":
      case "corollary":
      case "proposition":
      case "conjecture":
      case "definition":
      case "example":
      case "exercise":
         // These are Bookdown theorem types
         editor.setFileType(FileTypeRegistry.TEX);
      default:
         editor.setFileType(FileTypeRegistry.TEXT);
         break;
      }
   }
   
   private final CompletionContext rContext_;
   private final DocUpdateSentinel sentinel_;
}
