/**
 *
 * Copyright 2011, Ilia Frenkel <frenkel.ilia@gmail.com>
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
    /**
     * Note model properties.
     */
    self.id          = ko.observable(data.id || rndId());
    self.content     = ko.observable(data.content || "");
    self.subnotes    = ko.observableArray([]);
    self.parent      = ko.observable(data.parent || null);
    self.hasSubnotes = ko.computed(function() {
                        return self.subnotes().length > 0;
                       }, self);
    self.hash        = ko.computed(function() {
                        return "#" + self.id(); 
                       }, self);
    self.isOpen      = ko.observable(data.isOpen || false);
    self.isInEdit    = ko.observable(false);
    self.isZoomedIn  = ko.observable(false);

    /**
     * Note model methods.
     */
    /**
     * @method
     * Add a subnote.
     */
    self.addSubnote = function(subNote, subNoteIndex) {
        subNoteIndex = subNoteIndex || 0;
        subNote.parent(self);
        self.subnotes.splice(subNoteIndex, 0, subNote);
    };
    /**
     * @method
     * Insert a subnote after specified note.
     */
    self.insertSubnote = function(subNote, afterNote) {
        var i = self.subnotes.indexOf(afterNote);
        self.addSubnote(subNote, i+1);
    };
    /**
     * @method
     * Delete a subnote.
     */
    self.deleteSubnote = function(subNote) {
        subNote.prev = subNote.prevNote();
        self.subnotes.remove(subNote);
    };
    /**
     * @method
     * Returns next note on the same level (if any).
     */
    self.nextNote = function() {
        if (self.parent()) {
            var i = self.parent().subnotes.indexOf(self);
            return self.parent().subnotes()[i+1] || null;
        } else {
            var notesList = ko.contextFor($("#"+self.id())[0]).$root;
            var i = notesList.notes.indexOf(self);
            return notesList.notes()[i+1] || null;
        }
        return null;
    };
    /**
     * @method
     * Returns previous note on the same level (if any).
     */
    self.prevNote = function() {
        if (self.parent()) {
            var i = self.parent().subnotes.indexOf(self);
            return self.parent().subnotes()[i-1] || null;
        } else {
            var notesList = ko.contextFor($("#"+self.id())[0]).$root;
            var i = notesList.notes.indexOf(self);
            return notesList.notes()[i-1] || null;
        }
        return null;
    };
    /**
     * @method
     * Toggles a note state between open (expanded) and closed (collapsed).
     */
    self.toggleOpen = function() {
        var self = this;
        self.isOpen(!self.isOpen());
    };
    /**
     * @method
     * Set the note into edit mode. 
     */
    self.startEdit = function() {
        self.isInEdit(true);  
    };
    /**
     * @method
     * React on user input.
     */
    self.onUserInput = function(note, event) {
        //ENTER or SHIFT+ENTER.
        //On ENTER a new note on the same level is added AFTER the note on
        //which the key was pressed. On SHIFT+ENTER a new sub-note is added
        //as a first sub-note of the note on which the key was pressed.
        if (event.which == 13) {
            var newNote = new NoteModel({});
            if (event.shiftKey) {//new subnote
                self.addSubnote(newNote);
                if (!self.isOpen()) self.toggleOpen();
            } else {//new sibling note
                if (note.parent()) {
                    note.parent().insertSubnote(newNote, note);
                } else {//new top level note
                    var notesList = ko.contextFor(event.target).$root;
                    notesList.insertNote(newNote, note);
                }
            }
            newNote.startEdit();
        //KEY DOWN
        //If the cursor is at the end, move to the next visible note.
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
        //KEY UP
        //If the cursor is at the beginning, move to the previous visible note. 
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
        //KEY LEFT
        //If the cursor is at the beginning and note is open, close it. 
        } else if ((event.which == 37) && (event.target.selectionEnd == 0) && (!note.isZoomedIn())) {
            if (note.isOpen()) note.toggleOpen();
        //KEY RIGHT
        //If the cursor is at the end and note is closed, open it. 
        } else if ((event.which == 39) && (event.target.textLength-event.target.selectionStart == 0)) {
            if (!note.isOpen()) note.toggleOpen();
        //TAB or SHIFT+TAB
        //On TAB increase the level of the note (if possible). On SHIFT+TAB
        //decrease the level (if possible).
        } else if (event.which == 9) {//Tab
            if (note.isZoomedIn()) return;
            var parent = ko.contextFor(event.target).$parent;
            if (parent instanceof NoteModel) {
                if (event.shiftKey) {
                    if (parent.isZoomedIn()) return false;
                    var i = parent.subnotes.indexOf(note);
                    parent.subnotes.splice(i,1);
                    var grandParent = ko.contextFor($("#"+parent.id())[0]).$parent;
                    if (grandParent instanceof NoteModel) {
                        i = grandParent.subnotes.indexOf(parent);
                        grandParent.subnotes.splice(i+1,0,note);
                    } else {
                        i = grandParent.notes.indexOf(parent);
                        grandParent.notes.splice(i+1,0,note);
                    }
                } else {
                    var i = parent.subnotes.indexOf(note)-1;
                    if (i >= 0) {
                        //remove the note from current position
                        parent.subnotes.splice(i+1,1);
                        //add it as a subnote
                        parent.subnotes()[i].subnotes.push(note);
                        if (!parent.subnotes()[i].isOpen()) parent.subnotes()[i].toggleOpen();
                    }
                }
            } else {
                if (event.shiftKey) return;
                var i = parent.notes.indexOf(note)-1;
                if (i >= 0) {
                    //remove the note from current position
                    parent.notes.splice(i+1,1);
                    //add it as a subnote
                    parent.notes()[i].subnotes.push(note);
                    if (!parent.notes()[i].isOpen()) parent.notes()[i].toggleOpen();
                }
            }
        //BACKSPACE
        //If the cursor is at the beginning, delete the note. It is not actually
        //deleted, it is marked with a property named _destroy set to true.
        } else if (event.which == 8) {//Backspace
            if ((event.target.selectionStart==event.target.selectionEnd) && (event.target.selectionEnd==0)) {
                var notesList = ko.contextFor(event.target).$root;
                notesList.deleteNote(note);
            } else {
                return true;
            }
        } else {
            return true;
        };
    };
    /**
     * Initialising
     */
    //add subnotes creating new instances of NoteModel if necessary
    $.each(data.subnotes || [], function(idx, val) {
        if (val instanceof NoteModel) {
            self.addSubnote(val);
        } else {
            self.addSubnote(new NoteModel(val));
        };
    });
    return this;
};

/**
 * @class NotesListViewModel Data model that represents notes list.
 * @constructor
 * @param {object} data An object containing the required information to
 * construct an instance of NotesListViewModel.
 */
function NotesListViewModel(data) {
    var self = this;
    /**
     * NotesListView model properties.
     */
    self.notes = ko.observableArray([]);
    self.breadcrumbs = ko.observableArray([]);
    self.rootNote = ko.observable(null);
    self.rootNoteParent = null;
    
    /**
     * Array of deleted notes. Used for undo.
     */
    self.deletedNotes = ko.observableArray([]);

    /**
     * NotesListView model methods.
     */
    /**
     * @method
     * Add a new note to the list.
     */
    self.addNote = function(note, idx) {
        idx = idx || 0;
        if (note instanceof NoteModel) {
            self.notes.splice(idx, 0, note);
        } else {
            self.notes.splice(idx, 0, new NoteModel(note));
        }
    };
    /**
     * @method
     * Create an empty note and add it to the list.
     */
    self.newNote = function(parent) {
        var n = new NoteModel({});
        if (parent instanceof NoteModel) {
            parent.addSubnote(n);
        } else {
            self.addNote(n);
        };
        n.startEdit();
    };
    /**
     * @method
     * Insert a note after specified note.
     */
    self.insertNote = function(note, afterNote) {
        var i = self.notes.indexOf(afterNote);
        self.notes.splice(i+1, 0, note);
    };
    /**
     * @method
     * Delete a note.
     */
    self.deleteNote = function(note, canUndo) {
        canUndo = (typeof canUndo === "undefined") ? true : canUndo;
        if (note.parent()) {
            note.parent().deleteSubnote(note);
        } else {
            note.prev = note.prevNote();
            self.notes.remove(note);
        };
        if (canUndo) {
            self.deletedNotes.push(note);
        };
        //check if we have any notes left
        //if not add an empty one
        if (self.notes().length <= 0) {
            self.newNote(null);
        };
    };
    /**
     * @method
     * Zoom in to a note.
     */
    self.zoomIn = function(data, event) {
        var note;
        if (data instanceof NoteModel) {
            note = data;
        } else {
            note = data.note;
        }
        //"un-zoom" previously zoomed in note
        if (self.rootNote()) {
            self.rootNote().parent(self.rootNoteParent);
            self.rootNote().isZoomedIn(false);
            self.rootNote(null);
        }
        //update breadcrumbs
        self.breadcrumbs.removeAll();
        var parent = note.parent();
        while (parent) {
            self.breadcrumbs.unshift({
                hash: parent.hash(),
                text: parent.content,
                note: parent
            });
            parent = parent.parent();
        }
        //add the note to breadcrumbs
        self.breadcrumbs.push({hash:null,text:note.content()});        
        //expand self if needed
        if (!note.isOpen()) note.toggleOpen();
        //zoom in to the note
        note.isZoomedIn(true);
        self.rootNoteParent = note.parent(); 
        note.parent(null);
        self.rootNote(note);
        $("#"+note.id()+" > .editor").effect("transfer", {to: $("#breadcrumbs-nav > *").last(), className: "ui-effects-transfer"}, 400);
        $("#root > .note").show("puff",{percent:10}, 200);
    };
    /**
     * @method
     * Zoom out of a note to the root
     */
    self.zoomOut = function() {
        //"un-zoom" previously zoomed in note
        if (self.rootNote()) {
            self.rootNote().parent(self.rootNoteParent);
            self.rootNote().isZoomedIn(false);
            self.rootNote(null);
        }
        self.breadcrumbs.removeAll();
        $("#root > .note").show("scale",{percent:100}, 200);
    };
    /**
     * @method
     * Setup drag and drop.
     */
    self._setupDragDrop = function (elements, data) {
        $(elements).filter(".note").draggable({
            axis: 'y',
            handle: '> .drag-handler',
            revert: true,
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
                self.deleteNote(droppedNote, false); //delete the note, but don't add it to the undo queue
                if (isAbove) { //add above receiving note
                    if (receivingNote.parent()) {
                        receivingNote.parent().addSubnote(droppedNote, receivingNote.parent().subnotes.indexOf(receivingNote));
                    } else {
                        var notesList = ko.contextFor(this).$root;
                        notesList.addNote(droppedNote, notesList.notes.indexOf(receivingNote));
                    };
                } else { //add after receiving note
                    if (receivingNote.parent()) {
                        receivingNote.parent().insertSubnote(droppedNote, receivingNote);
                    } else {
                        var notesList = ko.contextFor(this).$root;
                        notesList.insertNote(droppedNote, receivingNote);
                    };
                };
            }
        });
    };
    /**
     * @method
     * Undo last action. 
     */
    self.undoLast = function() {
        if (self.deletedNotes().length > 0) {
            var restoredNote = self.deletedNotes.pop();
            if (restoredNote.parent()) {
                restoredNote.parent().insertSubnote(restoredNote, restoredNote.prev);
            } else {
                self.insertNote(restoredNote, restoredNote.prev);
            }
            delete restoredNote.prev;
        }
    };
    
    return this;
};