/*
 * UserPrefsDefaultLayer.cpp
 *
 * Copyright (C) 2009-19 by RStudio, Inc.
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

#include "UserPrefsDefaultLayer.hpp"
#include "UserPrefs.hpp"

#include <core/system/Xdg.hpp>

#include <session/SessionOptions.hpp>

using namespace rstudio::core;

namespace rstudio {
namespace session {
namespace modules {
namespace prefs {

core::Error UserPrefsDefaultLayer::readPrefs()
{
   return loadPrefsFromSchema(
      options().rResourcesPath().complete("schema").complete(kUserPrefsSchemaFile));
}

core::Error UserPrefsDefaultLayer::validatePrefs()
{
   // No need to validate defaults; they ship in the box and are validated at build time.
   return Success();
}

} // namespace prefs
} // namespace modules
} // namespace session
} // namespace rstudio

