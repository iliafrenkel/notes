/**
 *
 * Copyright 2012, Ilia Frenkel <frenkel.ilia@gmail.com>
 *
 *  This program is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation, either version 3 of the License, or
 *  (at your option) any later version.
 *
 *  This program is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License
 *  along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

/**
 * @class NotesApp Represents main application.
 * @constructor
 */
function NotesApp() {
    var self = this;

    self.rootNote     = null;
    self.listView     = null;
    self.deletedNotes = ko.observableArray([]);
    
    self.init = function() {
        // Create the root note and initialise bindings
        self.rootNote = new NoteModel({content:"Home"});
        self.listView = new NotesListViewModel(self.rootNote)
        ko.applyBindings(self, document.getElementById("content"));
        
        // Load notes from the server
        $("#root").mask("Loading notes...", 300);
        $.getJSON("/note/list/", function(data){
            self.rootNote.loadSubnotes(data);
            $("#root").unmask();
            if (self.rootNote.hasSubnotes()) {
                self.rootNote.subnotes()[0].startEdit();
            }
        })
        .error(function(res) {
            alert("Error occured while loading notes from the server.")
        });
        
        // Setup global keyboard shortcuts
        $('body').on('keydown', function(event){
            if (event.which==107) {
                self.rootNote.addSubnote().startEdit();
                return false;
            }
            return true;
        });
        
        //Start regular server sync
        setInterval(self.syncWithServer, 2000);
    };
    
    self.undo = function() {
        if (self.deletedNotes().length > 0) {
            var note = self.deletedNotes.pop();
            note.parent().addSubnote(note, {position: note.position()});
            note.remoteRestore();
        }
    };
    
    self.syncWithServer = function() {
        if (!self.rootNote) return;
        function sync_note(note) {
            if (note.isNew()) {
                note.remoteCreate();
            } else if (note.isDirty()) {
                note.remoteUpdate();
            };
            $.each(note.subnotes(), function(idx,val){sync_note(val)});
        };
        $.each(self.rootNote.subnotes(), function(idx,val){sync_note(val)});
    };
    
    return self;
};
