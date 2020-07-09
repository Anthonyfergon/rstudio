/*
 * PanmirrorUIContext.java
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

package org.rstudio.studio.client.panmirror.ui;


import org.rstudio.core.client.jsinterop.JsVoidFunction;

import elemental2.promise.Promise;
import jsinterop.annotations.JsFunction;
import jsinterop.annotations.JsType;

@JsType
public class PanmirrorUIContext
{
   public BooleanGetter isActiveTab;
   public Getter getDocumentPath;
   public WithSavedDocument withSavedDocument;
   public Getter getDefaultResourceDir;
   public Mapper mapPathToResource;
   public Mapper mapResourceToURL;
   public WatchResource watchResource;
   public Mapper translateText;

   
   @JsFunction 
   public interface Getter
   {
      String get();
   }
   
   @JsFunction
   public interface BooleanGetter
   {
      Boolean get();
   }
   
   @JsFunction
   public interface Mapper
   {
      String map(String path);
   }
   
   @JsFunction
   public interface WatchResource
   {
      JsVoidFunction watchResource(String path, JsVoidFunction notify);
   }
   
   @JsFunction
   public interface WithSavedDocument
   {
      Promise<Boolean> withSavedDocument();
   }
}


