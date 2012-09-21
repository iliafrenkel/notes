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

class Note(db.Model):
    """
        Note model class.
        Properties:
    """
    content     = db.StringProperty(required=True)
    parentNote  = db.SelfReferenceProperty(collection_name='subnotes')
    nextNote    = db.SelfReferenceProperty()
    
    def to_dict(self):
        """
        Converts Note model to dictionary
        """
        subnotes = []
        res = self.subnotes.fetch(None)
        for s in res:
            subnotes.append(s.to_dict())
        return {
               "id"          : unicode(self.key()),
               "content"     : unicode(self.content),
               "subnotes"    : subnotes
               }
