#
# Copyright 2012, Ilia Frenkel <frenkel.ilia@gmail.com>
#
#  This program is free software: you can redistribute it and/or modify
#  it under the terms of the GNU General Public License as published by
#  the Free Software Foundation, either version 3 of the License, or
#  (at your option) any later version.
#
#  This program is distributed in the hope that it will be useful,
#  but WITHOUT ANY WARRANTY; without even the implied warranty of
#  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
#  GNU General Public License for more details.
#
#  You should have received a copy of the GNU General Public License
#  along with this program.  If not, see <http://www.gnu.org/licenses/>.

from google.appengine.api import namespace_manager
from google.appengine.api import users

def namespace_manager_default_namespace_for_request():
    """Determine which namespace is to be used for a request."""
    user = users.get_current_user()
    if user:
        return user.user_id()
    else:
        return None
