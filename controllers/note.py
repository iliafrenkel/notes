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
from google.appengine.api import namespace_manager
from google.appengine.ext import db
from models.note import Note
import json
import time
import urlparse

class NoteController(webapp2.RequestHandler):
    """
        This class handles all REST requests related to a Note.
    """

    def list_notes(self, parent=None, list_deleted=False):
        """
            Returns all notes (with sub-notes) as a JSON string. If parent is
            given returns all notes starting from the parent. If `list_deleted`
            is True returns only deleted notes.
        """
        if parent:
            return json.dumps(parent.to_dict())
        else:
            notes = Note.all().filter('parentNote ==', None).filter('deleted ==', list_deleted).order('position').fetch(None)
            res = []
            for n in notes:
                res.append(n.to_dict())
            return json.dumps(res)

    def create_note(self, content, parent=None, after=None):
        """
            Creates a new note, saves it to datastore and returns newly
            created note as JSON string. If `after` parameter is given,
            new note will have position property set to be greater than
            the one specified.
        """
        if after:
            position = after.position + 1
        else:
            position = 0
        notes = Note.all().filter("position >=", position).filter("parentNote ==", parent).order("position").fetch(None)
        cnt = 1
        for n in notes:
            n.position = position + cnt
            n.put()
            cnt = cnt + 1
        note = Note(content=content, parentNote=parent, position=position)
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
            Mark a note as deleted.
        """
        note.deleted = True
        note.put()
        return json.dumps(note.to_dict())
    
    def restore_note(self, note):
        """
            Restores previously deleted note.
        """
        note.deleted = False
        note.put()
        return json.dumps(note.to_dict())
    
    def move_note(self, note, parent, after=None):
        """
            Moves a note to a new parent.
        """
        if after:
            position = after.position + 1
        else:
            position = 0
        notes = Note.all().filter("position >=", position).filter("parentNote ==", parent).order("position").fetch(None)
        cnt = 1
        for n in notes:
            n.position = position + cnt
            n.put()
            cnt = cnt + 1

        note.parentNote = parent
        note.position = position
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
            #n4 = Note(content="The path of the righteous man is beset on all sides by the iniquities of the selfish and the tyranny of evil men.", parentNote=root, position=1)
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
            try:
                if db.Key(note_id).namespace() != namespace_manager.get_namespace():
                    self.response.clear()
                    self.response.set_status(401)
                    self.response.out.write("You are not authorised to access this resource.")
                    return
            except datastore_errors.BadKeyError:
                pass

            if op == 'create':
                pid = self.request.get("parentId")
                afterId = self.request.get("afterNote")
                content = self.request.get("content")
                try:
                    parent = Note.get(pid)
                except datastore_errors.BadKeyError:
                    parent = None
                try:
                    after = Note.get(afterId)
                except datastore_errors.BadKeyError:
                    after = None
                self.response.headers['Content-Type'] = 'application/json'
                self.response.out.write(self.create_note(content, parent, after))
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
            elif op == 'restore':
                try:
                    note = Note.get(note_id)
                    self.response.headers['Content-Type'] = 'application/json'
                    self.response.out.write(self.restore_note(note))
                except datastore_errors.BadKeyError:
                    self.response.clear()
                    self.response.set_status(404)
                    self.response.out.write("Note not found.")
            elif op == 'move':
                pid = self.request.get("parentId")
                afterId = self.request.get("afterNote")
                try:
                    parent = Note.get(pid)
                except datastore_errors.BadKeyError:
                    parent = None
                try:
                    after = Note.get(afterId)
                except datastore_errors.BadKeyError:
                    after = None
                try:
                    note = Note.get(note_id)
                    self.response.headers['Content-Type'] = 'application/json'
                    self.response.out.write(self.move_note(note, parent, after))
                except datastore_errors.BadKeyError:
                    self.response.clear()
                    self.response.set_status(404)
                    self.response.out.write("Note not found.")
            else:
                self.response.clear()
                self.response.set_status(501)
                self.response.out.write("Unknown operation.")
        except DeadlineExceededError:
            self.response.clear()
            self.response.set_status(500)
            self.response.out.write("This operation could not be completed in time...")

