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
 * @class NoteModel Data model that represents single note.
 * @constructor
 * @param {object} data An object containing the required information to
 * construct an instance of NoteModel.
 */
function NoteModel(data) {
    var self = this;
    data = data || {};
    /**
     * Note model properties.
     */
    self.id          = ko.observable(data.id || rndId());
    self.content     = ko.observable(data.content || "");
    self.contentFormatted = ko.computed(function() {
            var linkRegexp = /(\b(https?|ftp|file):\/\/[\-A-Z0-9+&@#\/%?=~_|!:,.;]*[\-A-Z0-9+&@#\/%=~_|])/ig;
            var tagRegexp = /\s#(\w+)/g;
            return self.content().replace(tagRegexp, '<a href="#$1" class="tag-link" onclick="app.searchTag(\'$1\')">$&</a>').replace(linkRegexp, '<a href="$&">$&</a>');
        }, self);
    self.subnotes    = ko.observableArray([]);
    self.parent      = ko.observable(data.parent || null);
    self.position    = ko.observable(data.position || 0);
    self.isDeleted   = ko.observable(data.deleted || false);
    self.lastUpdated = ko.observable(data.updated || null);
    self.created     = ko.observable(data.created || null);
    self.hasSubnotes = ko.computed(function() {
                        return self.subnotes().length > 0;
                       }, self);
    self.hash        = ko.computed(function() {
                        return "#" + self.id(); 
                       }, self);
    self.isOpen      = ko.observable(data.isOpen || false);
    self.isInEdit    = ko.observable(false);
    self.isZoomedIn  = ko.observable(false);
    self.isDirty     = ko.observable(false);
    self.isNew       = ko.observable(false);

    /**
     * Note model methods that manipulate sub-notes and position.
     */
    /**
     * @method
     * Adds a sub-note to self creating new instance of NoteModel if needed.
     * @param {object} note Either an instance of NoteModel or an object that
     *                      will be passed to NodeModel constructor.
     * @param {object} opts Hash object with options that will define where in
     *                      the hierarchy a new note will be inserted. Possible
     *                      values for the hash are:
     *                      opts.position - if specified provides a numerical
     *                      index at which new note will be inserted;
     *                      opts.after - an instance of NoteModel after which
     *                      new note will be inserted;
     *                      opts.before - an instance of NoteModel before which
     *                      new note will be inserted.
     *                      If no options are specified a note will be inserted
     *                      at the end.
     * @return {object} An instance of NoteModel.
     */
    self.addSubnote = function(note, opts) {
        opts = opts || {};
        if (!(note instanceof NoteModel)) {
            note = new NoteModel(note);
        };
        note.parent(self);
        if (opts.position >= 0) {
            self.subnotes.splice(opts.position, 0, note);
        } else if ((opts.after) && (opts.after instanceof NoteModel)) {
            var idx = self.subnotes.indexOf(opts.after) + 1;
            self.subnotes.splice(idx, 0, note);
        } else if ((opts.before) && (opts.before instanceof NoteModel)) {
            var idx = self.subnotes.indexOf(opts.before);
            self.subnotes.splice(idx, 0, note);
        } else {
            self.subnotes.push(note);
        };
        if (!note.lastUpdated()) {
            note.isNew(true);
        };
        return note;
    };
    /**
     * @method
     * Loads multiple sub-notes.
     * @param {array} notes Array of notes to load. Each note can be either an
     *                      instance of NoteModel or a hash object that will be
     *                      passed to NoteModel constructor.  
     */
    self.loadSubnotes = function (notes) {
        $.each(notes, function(idx, val) {
            self.addSubnote(val);
        });
    };
    /**
     * @method
     * Deletes a sub-note.
     * @param {object} note An instance of NoteModel to delete.
     * @return {object} An instance of the deleted note.
     */
    self.deleteSubnote = function(note) {
        self.subnotes.remove(note); //remove from sub-notes
        note.isDeleted(true);
        note.remoteDelete();        //mark for deletion on the server
        app.deletedNotes.push(note);//add to deletedNotes for undo        
        return note;
    };
    /**
     * @method
     * Moves sub-note to another position (possibly within another parent).
     * @param {object} note   An instance of NoteModel to be moved.
     * @param {object} opts   Options hash object that specifies new position
     *                        for the note. See addSubnote method for details.
     * @param {object} parent An instance of NoteModel that will be a new
     *                        parent for the note or null if note is moved
     *                        within the same parent.
     */
    self.moveSubnote = function(note, opts, parent) {
        self.subnotes.remove(note);
        if (parent) {
            parent.addSubnote(note, opts);
            note.remoteMove();
            return note;
        } else {
            return self.addSubnote(note, opts);
        }
    }
    /**
     * @method
     * Returns next note on the same level as self (if any).
     * @return {object} An instance of NoteModel or null if the note is the
     *                  last one. 
     */
    self.nextNote = function() {
        if (self.parent()) {
            var i = self.parent().subnotes.indexOf(self);
            return self.parent().subnotes()[i+1] || null;
        }
        return null;
    };
    /**
     * @method
     * Returns previous note on the same level as self (if any).
     * @return {object} An instance of NoteModel or null if the note is the
     *                  first one.
     */
    self.prevNote = function() {
        if (self.parent()) {
            var i = self.parent().subnotes.indexOf(self);
            return self.parent().subnotes()[i-1] || null;
        }
        return null;
    };
    /**
     * @method
     * Returns sub-note by ID.
     * @return  {object} An instance of NoteModel or null if not found.
     */
    self.findById = function(noteId) {
        $.each(self.subnotes(), function(idx, val) {
            if (val.id == noteId) return val;
        });
    }

    /**
     * Note model methods related to UI.
     */
    /**
     * @method
     * Toggles a note state between open (expanded) and closed (collapsed).
     */
    self.toggleOpen = function() {
        self.isOpen(!self.isOpen());
    };
    /**
     * @method
     * Set the note into edit mode allowing user to make some changes. 
     */
    self.startEdit = function() {
        self.isInEdit(true);
        return true;  
    };
    /**
     * @method
     * Reacts on user input.
     * @param {object} note  An instance of NoteModel that received an event.
     * @param {object} event Browser event object (keydown).
     * 
     * Following events are intercepted:
     *   ENTER       - adds new note after the note on which event has occurred;
     *   SHIFT+ENTER - adds new sub-note to a note on which event has occurred;
     *   KEY DOWN    - moves to the next visible note if the cursor is at end;
     *   KEY UP      - moves to the previous visible note if the cursor is at
     *                 the beginning;
     *   KEY LEFT    - closes (collapses) the note if it is open and the cursor
     *                 is at the beginning;
     *   KEY RIGHT   - opens (expands) the note if it is closed and the cursor
     *                 is at the end;
     *   TAB         - increases the level of the note (if possible), makes it
     *                 a sub-note of the previous (sibling) note;
     *   SHIFT+TAB   - decrease the level of the note (if possible), makes it
     *                 sibling of its parent;
     *   BACKSPACE   - deletes the note (and all its sub-notes) if the cursor
     *                 is at the beginning. 
     */
    self.onUserInput = function(note, event) {
        //ENTER or SHIFT+ENTER.
        if (event.which == 13) {
            if (event.shiftKey) {//new sub-note
                if (!self.isOpen()) self.toggleOpen();
                self.addSubnote(null, {position:0}).startEdit();
            } else {//new sibling note
                note.parent().addSubnote(null, {after:note}).startEdit();
            }
        //ARROW KEY DOWN
        } else if ((event.which == 40) && (event.target.textLength-event.target.selectionStart==0)) {
            if (note.isOpen() && note.hasSubnotes()) {
                note.subnotes()[0].startEdit();
            } else {
                var next = note;
                while (next) {
                    if (next.nextNote()) {
                        next.nextNote().startEdit();
                        return;
                    } else {
                        next = next.parent();
                    }
                };
            }
            return true;
        //ARROW KEY UP
        } else if ((event.which == 38) && (event.target.selectionEnd==0)) {
            function lastChild(parent) {
                if ((parent.hasSubnotes()) && (parent.isOpen())) {
                    return lastChild(parent.subnotes()[parent.subnotes().length-1]);
                } else {
                    return parent;
                }
            };
            var lastOpenNote = null;
            var prevNote = note.prevNote();
            if (prevNote) {
                lastOpenNote = lastChild(prevNote);
            } else {
                lastOpenNote = note.parent();
            }
            if (lastOpenNote) lastOpenNote.startEdit();
            return true;
        //ARROW KEY LEFT
        } else if ( (event.which == 37) && (!note.isZoomedIn())&& ((event.target.selectionEnd == 0) || event.ctrlKey) ) {
            if (note.isOpen()) note.toggleOpen();
        //ARROW KEY RIGHT
        } else if ((event.which == 39) && ((event.target.textLength-event.target.selectionStart == 0) || event.ctrlKey) ) {
            if (!note.isOpen()) note.toggleOpen();
        //TAB or SHIFT+TAB
        } else if (event.which == 9) {
            if (note.isZoomedIn()) return;
            var parent = note.parent();
            var grandParent = parent.parent();
            if (event.shiftKey) {
                if (parent.isZoomedIn()) return false;
                parent.moveSubnote(note, {after: parent}, grandParent);
                $(note.hash()+" > .editor > textarea").effect("highlight", {}, 1000);
            } else {
                if (note.prevNote()) {
                    if (!note.prevNote().isOpen()) note.prevNote().toggleOpen();
                    parent.moveSubnote(note, {}, note.prevNote());
                    $(note.hash()+" > .editor > textarea").effect("highlight", {}, 1000);
                }
            }
        //BACKSPACE
        } else if (event.which == 8) {
            if ((event.target.selectionStart==event.target.selectionEnd) && (event.target.selectionEnd==0)) {
                if (note.prevNote()) {
                    note.prevNote().startEdit();
                } else if (note.parent()) {
                    note.parent().startEdit();
                };
                note.parent().deleteSubnote(note);
            } else {
                return true;
            }
        } else {
            return true;
        };
    };

    /**
     * Note model methods responsible for communication with the server.  
     */
    /**
     * @method
     * Send a request to the server to create a new note. 
     */
    self.remoteCreate = function() {
        var afterNote = "";
        if (self.prevNote()) {
            afterNote = self.prevNote().id();
        }
        $.post("/note/create/",
            {
                "parentId" : self.parent().id(),
                "afterNote": afterNote,
                "content"  : self.content()
            },
            function(data) {
                self.id(data.id);
                self.lastUpdated(data.updated);
                self.isNew(false);
            }
        );
    };
    /**
     * @method
     * Update a note on the server.
     */
    self.remoteUpdate = function() {
        $.post("/note/update/"+self.id(),
            {
                "content"  : self.content()
            },
            function(data) {
                self.lastUpdated(data.updated);
                self.isDirty(false);
            }
        ).
        error(function(res) {
            app.showErrorPopup("Server returned an error while trying to save the note. I will try again in a moment.");
        });
    };
    /**
     * @method
     * Delete a note on the server.
     */
    self.remoteDelete = function() {
        $.post("/note/delete/"+self.id(),
            function(data) {
                self.lastUpdated(data.updated);
            }
        ).
        error(function(res) {
            app.showErrorPopup("Server returned an error while trying to delete the note. I will try again in a moment.");
        });
    };
    /**
     * @method
     * Restore previously deleted note on the server.
     */
    self.remoteRestore = function() {
        $.post("/note/restore/"+self.id(),
            function(data) {
                self.lastUpdated(data.updated);
                self.isDeleted(data.deleted);
            }
        ).
        error(function(res) {
            app.showErrorPopup("Server returned an error while trying to restore the note. I will try again in a moment.");
        });
    };
    /**
     * @method
     * Move a note to another parent on the server.
     */
    self.remoteMove = function() {
        var afterNote = "";
        if (self.prevNote()) {
            afterNote = self.prevNote().id();
        }
        $.post("/note/move/"+self.id(),
            {
                "parentId" : self.parent().id(),
                "afterNote" : afterNote
            },
            function(data) {
                self.lastUpdated(data.updated);
            }
        ).
        error(function(res) {
            app.showErrorPopup("Server returned an error while trying to move the note. I will try again in a moment.");
        });
    };
    
    /**
     * Initialising.
     */
    //add sub-notes creating new instances of NoteModel if necessary
    $.each(data.subnotes || [], function(idx, val) {
        self.addSubnote(val);
    });
    //subscribe to changes of content to save it to the server periodically
    self.content.subscribe(function(newValue){
        self.isDirty(true);
    });

    return self;
};

/**
 * @class NotesListViewModel Data model that represents notes list.
 * @constructor
 * @param {object} root An instance of NoteModel that will become the root
 *                      note of the notes tree.
 */
function NotesListViewModel(root) {
    var self = this;
    /**
     * NotesListView model properties.
     */
    self.rootNote = ko.observable(root || null);

    /**
     * @method
     * Makes a specified note a root note. 
     */
    self.zoomIn = function(note, event) {
        if (self.rootNote() == note) return;
        $("#subnotes").hide("puff",{percent:10}, 200);
        $("#add-note").hide("puff",{percent:10}, 200);
        $("#root > h2").hide("puff",{percent:10}, 200, function(){
            if (self.rootNote()) {
                self.rootNote().isZoomedIn(false);
            };
            self.rootNote(note);
            note.isZoomedIn(true);
            $("#subnotes").show("puff",{percent:10}, 200);
            $("#add-note").show("puff",{percent:10}, 200);
            $("#breadcrumbs > *").last().css({opacity:0});
            $("#root > h2").show("puff",{percent:10}, 200, function(){
                $("#root > h2").effect("transfer", {to: $("#breadcrumbs > *").last(), className: "ui-effects-transfer"}, 300, function() {
                    $("#breadcrumbs > *").last().show("puff",{percent:10}, 200, function(){
                        $("#breadcrumbs > *").last().css({opacity:1});
                    });
                });
            });
        });
    };
     /**
     * @method
     * Setup drag and drop.
     */
    self._setupDragDrop = function (elements, data) {
        $(elements).filter(".note").draggable({
            axis: 'y',
            handle: '> .drag-handler',
            revert: false,
            scope: 'notes',
            opacity: 0.6,
            //stack: ".content",
            helper: 'clone',
            delay: 200
        });
        $(elements).filter(".note").find("> .drop-target").droppable({
            hoverClass: 'droppable',
            greedy: true,
            scope: 'notes',
            tolerance: 'intersect',
            drop: function(event, ui) {
                var receivingNote = ko.dataFor(this);
                var droppedNote   = ko.dataFor(ui.draggable[0]);
                if ((!receivingNote) || (!droppedNote)) return;
                var isAbove = $(this).hasClass("above");
                if (isAbove) { //add above receiving note
                    droppedNote.parent().moveSubnote(droppedNote, {before: receivingNote}, receivingNote.parent());
                } else { //add after receiving note
                    droppedNote.parent().moveSubnote(droppedNote, {after: receivingNote}, receivingNote.parent());
                };
            }
        });
    };
   
    if (self.rootNote()) self.zoomIn(self.rootNote());
    return self;
};
