/*
 * PanmirrorXRefServer.java
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


package org.rstudio.studio.client.panmirror.server;

import org.rstudio.core.client.promise.PromiseServerRequestCallback;
import org.rstudio.studio.client.RStudioGinjector;
import org.rstudio.studio.client.workbench.views.source.editors.text.TextEditingTarget;

import com.google.gwt.core.client.JavaScriptObject;
import com.google.inject.Inject;

import elemental2.promise.Promise;
import elemental2.promise.Promise.PromiseExecutorCallbackFn.RejectCallbackFn;
import elemental2.promise.Promise.PromiseExecutorCallbackFn.ResolveCallbackFn;
import jsinterop.annotations.JsType;

@JsType
public class PanmirrorXRefServer
{
   public PanmirrorXRefServer(TextEditingTarget target) {
      RStudioGinjector.INSTANCE.injectMembers(this);
      target_ = target;
   }
   
   @Inject
   void initialize(PanmirrorXRefServerOperations server)
   {
      server_ = server;
   }
   
   public Promise<JavaScriptObject> indexForFile(String file)
   {
      return new Promise<JavaScriptObject>((ResolveCallbackFn<JavaScriptObject> resolve, RejectCallbackFn reject) -> {
         target_.withSavedDoc(() -> {
            server_.xrefIndexForFile(
               file,
               new PromiseServerRequestCallback<JavaScriptObject>(resolve, reject)
            );
         });
         
      });
   }

   private final TextEditingTarget target_;
   private PanmirrorXRefServerOperations server_;
}
