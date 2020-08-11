/*
 * ZoteroCollections.hpp
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

#ifndef RSTUDIO_SESSION_MODULES_ZOTERO_COLLECTIONS_HPP
#define RSTUDIO_SESSION_MODULES_ZOTERO_COLLECTIONS_HPP

#include <string>

#include <boost/function.hpp>

#include <shared_core/json/Json.hpp>

namespace rstudio {
namespace core {
class Error;
}
}

namespace rstudio {
namespace session {
namespace modules {
namespace zotero {
namespace collections {


extern const char * const kName;
extern const char * const kVersion;
extern const char * const kItems;

extern const char * const kMyLibrary;

extern const int kNoVersion;

// collection spec
struct ZoteroCollectionSpec
{
   ZoteroCollectionSpec(const std::string& name = "", int version = kNoVersion)
      : name(name), version(version)
   {
   }
   bool empty() const { return name.empty(); }
   std::string name;
   int version;
};
typedef std::vector<ZoteroCollectionSpec> ZoteroCollectionSpecs;
typedef boost::function<void(core::Error,ZoteroCollectionSpecs)> ZoteroCollectionSpecsHandler;

// collection
struct ZoteroCollection : ZoteroCollectionSpec
{
   ZoteroCollection() : ZoteroCollectionSpec("", kNoVersion) {}
   explicit ZoteroCollection(const std::string& colName)
      : ZoteroCollectionSpec(colName, kNoVersion)
   {
   }
   explicit ZoteroCollection(const ZoteroCollectionSpec& spec)
      : ZoteroCollectionSpec(spec.name, spec.version)
   {
   }
   core::json::Array items;
};
typedef std::vector<ZoteroCollection> ZoteroCollections;
typedef boost::function<void(core::Error,ZoteroCollections,std::string)> ZoteroCollectionsHandler;


// requirements for implementing a collection source
struct ZoteroCollectionSource
{
   boost::function<void(std::string,
                        ZoteroCollectionSpec cacheSpec,
                        ZoteroCollectionsHandler)> getLibrary;

   boost::function<void(std::string,
                        std::vector<std::string>,
                        ZoteroCollectionSpecs,
                        ZoteroCollectionsHandler)> getCollections;
};

// get the entire library using the currently configured source
void getLibrary(ZoteroCollectionSpec cacheSpec,
                bool useCache,
                ZoteroCollectionsHandler handler);

// get collections using the currently configured source
void getCollections(std::vector<std::string> collections,
                    ZoteroCollectionSpecs cacheSpecs,
                    bool useCache,
                    ZoteroCollectionsHandler handler);


} // end namespace collections
} // end namespace zotero
} // end namespace modules
} // end namespace session
} // end namespace rstudio

#endif /* RSTUDIO_SESSION_MODULES_ZOTERO_COLLECTIONS_HPP */
