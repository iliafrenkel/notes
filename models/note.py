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

"""
    Note model class inherits from db.Model and represents a note stored
    in Google App Engine DB.
"""

from google.appengine.ext import db
import time

class Note(db.Model):
    """
        Note model class.
        Properties:
    """
    content     = db.StringProperty()
    position    = db.IntegerProperty(required=True,default=0)
    created     = db.DateTimeProperty(auto_now_add=True)
    updated     = db.DateTimeProperty(auto_now=True)
    parentNote  = db.SelfReferenceProperty(collection_name='subnotes')
    deleted     = db.BooleanProperty(required=True,default=False)

    def to_dict(self):
        """
        Converts Note model to dictionary
        """
        subnotes = []
        res = self.subnotes.order('position').fetch(None)
        for s in res:
            subnotes.append(s.to_dict())
        return {
               "id"          : unicode(self.key()),
               "content"     : unicode(self.content),
               "position"    : self.position,
               "created"     : time.mktime(self.created.timetuple())*1000,
               "updated"     : time.mktime(self.updated.timetuple())*1000,
               "subnotes"    : subnotes,
               "deleted"     : self.deleted
               }
