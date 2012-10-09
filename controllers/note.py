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

import webapp2
from google.appengine.runtime import DeadlineExceededError
from google.appengine.api import datastore_errors
from models.note import Note
import json
import time
import urlparse

class NoteController(webapp2.RequestHandler):
    """
        This class handles all REST requests related to a Note.
    """
    def get(self):
        """
            Returns either all the notes or a specific note with sub-notes
            (optionally).
        """
        try:
            ##################
            #root = Note(content="Well, the way they make shows is, they make one show.")
            #root.put()
            #n1 = Note(content="That show's called a pilot.",parentNote=root)
            #n1.put()
            #n2 = Note(content="Then they show that show to the people who make shows...",parentNote=n1)
            #n2.put()
            #n3 = Note(content="... and on the strength of that one show they decide if they're going to make more shows. Some pilots get picked and become television programs. Some don't, become nothing. She starred in one of the ones that became nothing.",parentNote=n2)
            #n3.put()
            #n4 = Note(content="The path of the righteous man is beset on all sides by the iniquities of the selfish and the tyranny of evil men.", parentNote=root, position=1)
            #n4.put()
            ##################
            notes = Note.all().filter('parentNote ==', None).order('position').fetch(None)
            res = []
            for n in notes:
                res.append(n.to_dict())
            self.response.headers['Content-Type'] = 'application/json'
            self.response.out.write(json.dumps(res))
        except DeadlineExceededError:
            self.response.clear()
            self.response.set_status(500)
            self.response.out.write("This operation could not be completed in time...")

    def post(self):
        """

            Creates new note.
        """
        try:
            parentId = self.request.get("parentId")
            content = self.request.get("content")
            try:
                parent = Note.get(parentId)
            except datastore_errors.BadKeyError:
                parent = None
            note = Note(content=content, parentNote=parent)
            note.put()
            self.response.headers['Content-Type'] = 'application/json'
            self.response.out.write(json.dumps(note.to_dict()))
        except DeadlineExceededError:
            self.response.clear()
            self.response.set_status(500)
            self.response.out.write("This operation could not be completed in time...")

    def put(self):
        """
            Update existing note.
        """
        try:
            noteId = self.request.get("id")
            parentId = self.request.get("parentId")
            content = self.request.get("content")
            try:
                parent = Note.get(parentId)
            except datastore_errors.BadKeyError:
                parent = None
            try:
                note = Note.get(noteId)
                note.content = content
                note.parentNote = parent
                note.put()
                self.response.headers['Content-Type'] = 'application/json'
                self.response.out.write(json.dumps(note.to_dict()))
            except datastore_errors.BadKeyError:
                self.response.clear()
                self.response.set_status(404)
                self.response.out.write("Note not found.")
        except DeadlineExceededError:
            self.response.clear()
            self.response.set_status(500)
            self.response.out.write("This operation could not be completed in time...")

    def delete(self):
        """
            Delete existing note.
        """
        def deleteNote(note):
            notesDeleted = 0
            subnotes = note.subnotes.fetch(None)
            for sn in subnotes:
                notesDeleted = notesDeleted + deleteNote(sn)
            note.delete()
            return notesDeleted + 1
            
        try:
            data = urlparse.parse_qs(self.request.body)
            noteId  = data["id"][0]
            try:
                note = Note.get(noteId)
                notesDeleted = deleteNote(note)
                self.response.headers['Content-Type'] = 'application/json'
                self.response.out.write('{"result":"OK","count":'+str(notesDeleted)+'}')
            except datastore_errors.BadKeyError:
                self.response.clear()
                self.response.set_status(404)
                self.response.out.write("Note not found.")
        except DeadlineExceededError:
            self.response.clear()
            self.response.set_status(500)
            self.response.out.write("This operation could not be completed in time...")
