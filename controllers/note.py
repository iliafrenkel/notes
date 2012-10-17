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

    def list_notes(self, parent=None):
        """
            Returns all notes as a JSON string. If parent is given returns
            all notes starting from the parent.
        """
        if parent:
            return json.dumps(parent.to_dict())
        else:
            notes = Note.all().filter('parentNote ==', None).order('position').fetch(None)
            res = []
            for n in notes:
                res.append(n.to_dict())
            return json.dumps(res)

    def create_note(self, content, parent=None):
        """
            Creates a new note, saves it to datastore and returns newly
            created note as JSON string.
        """
        note = Note(content=content, parentNote=parent)
        note.put()
        return json.dumps(note.to_dict())

    def update_note(self, note, content):
        """
            Updates the content of existing note and returns it as JSON string.
        """
        note.content = content
        note.put()
        return json.dumps(note.to_dict())
    
    def delete_note(self, note):
        """
            Deletes a note and all its sub-notes.
        """
        subnotes = note.subnotes.fetch(None)
        for s in subnotes:
            self.delete_note(s)
        note.delete();
        return "Note deleted."
    
    def move_note(self, note, parent):
        """
            Moves a note to a new parent.
        """
        note.parentNote = parent
        note.put()
        return json.dumps(note.to_dict())


    def get(self, op, note_id):
        """
            Handles HHTP GET requests.
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
            #n4 = Note(content="The path of the righteous man is beset on all sides by the iniquities of the selfish and the tyranny of evil men.", parentNote=root)
            #n4.put()
            ##################
            if op == 'list':
                try:
                    note = Note.get(note_id)
                except datastore_errors.BadKeyError:
                    note = None
                self.response.headers['Content-Type'] = 'application/json'
                self.response.out.write(self.list_notes(note))
            else:
                self.response.clear()
                self.response.set_status(501)
                self.response.out.write("Unknown operation.")
        except DeadlineExceededError:
            self.response.clear()
            self.response.set_status(500)
            self.response.out.write("This operation could not be completed in time...")

    def post(self, op, note_id):
        """
            Handles HHTP POST requests.
        """
        try:
            if op == 'create':
                pid = self.request.get("parentId")
                content = self.request.get("content")
                try:
                    parent = Note.get(pid)
                except datastore_errors.BadKeyError:
                    parent = None
                self.response.headers['Content-Type'] = 'application/json'
                self.response.out.write(self.create_note(content, parent))
            elif op == 'update':
                content = self.request.get("content")
                try:
                    note = Note.get(note_id)
                    self.response.headers['Content-Type'] = 'application/json'
                    self.response.out.write(self.update_note(note, content))
                except datastore_errors.BadKeyError:
                    self.response.clear()
                    self.response.set_status(404)
                    self.response.out.write("Note not found.")
            elif op == 'delete':
                try:
                    note = Note.get(note_id)
                    self.response.headers['Content-Type'] = 'application/json'
                    self.response.out.write(self.delete_note(note))
                except datastore_errors.BadKeyError:
                    self.response.clear()
                    self.response.set_status(404)
                    self.response.out.write("Note not found.")
            elif op == 'move':
                pid = self.request.get("parentId")
                try:
                    parent = Note.get(pid)
                    if parent:
                        try:
                            note = Note.get(note_id)
                            self.response.headers['Content-Type'] = 'application/json'
                            self.response.out.write(self.move_note(note, parent))
                        except datastore_errors.BadKeyError:
                            self.response.clear()
                            self.response.set_status(404)
                            self.response.out.write("Note not found.")
                    else:
                        self.response.clear()
                        self.response.set_status(404)
                        self.response.out.write("Note (parent) not found.")
                except datastore_errors.BadKeyError:
                    self.response.clear()
                    self.response.set_status(404)
                    self.response.out.write("Note (parent) not found.")
            else:
                self.response.clear()
                self.response.set_status(501)
                self.response.out.write("Unknown operation.")
        except DeadlineExceededError:
            self.response.clear()
            self.response.set_status(500)
            self.response.out.write("This operation could not be completed in time...")

