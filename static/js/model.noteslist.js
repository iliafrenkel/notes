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
    data = data || {};
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
     * Adds a sub-note.
     */
    self.addSubnote = function(note, opts) {
        opts = opts || {};
        if (!(note instanceof NoteModel)) {
            note = new NoteModel(note);
            note.parent(self);
        };
        if (opts.index) {
            self.subnotes.splice(opts.index, 0, note);
        } else if ((opts.after) && (opts.after instanceof NoteModel)) {
            var idx = self.subnotes.indexOf(opts.after) + 1;
            self.subnotes.splice(idx, 0, note);
        } else if ((opts.before) && (opts.after instanceof NoteModel)) {
            var idx = self.subnotes.indexOf(opts.before);
            self.subnotes.splice(idx, 0, note);
        } else {
            self.subnotes.push(note);
        };
        return note;
    };
    /**
     * @method
     * Loads multiple notes. 
     */
    self.loadSubnotes = function (notes) {
        $.each(notes, function(idx, val) {
            self.addSubnote(val);
        });
    };
    /**
     * @method
     * Deletes a sub-note.
     */
    self.deleteSubnote = function(note) {
        self.subnotes.remove(note);
    };
    /**
     * @method
     * Returns next note on the same level (if any).
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
     * Returns previous note on the same level (if any).
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
    self._setupDragDrop = function() {return true};
    /**
     * Initialising
     */
    //add subnotes creating new instances of NoteModel if necessary
    $.each(data.subnotes || [], function(idx, val) {
        self.addSubnote(val);
    });
    return this;
};

/**
 * @class NotesListViewModel Data model that represents notes list.
 * @constructor
 * @param {object} data An object containing the required information to
 * construct an instance of NotesListViewModel.
 */
function NotesListViewModel(root) {
    var self = this;
    /**
     * NotesListView model properties.
     */
    self.rootNote = ko.observable(root || null);

    /**
     * @method 
     */
    self.zoomIn = function(data, event) {
        var note;
        if (data instanceof NoteModel) {
            note = data;
        } else {
            note = data.note;
        };
        self.rootNote().isZoomedIn(false);
        self.rootNote(note);
        note.isZoomedIn(true);
    };
    
    return this;
};