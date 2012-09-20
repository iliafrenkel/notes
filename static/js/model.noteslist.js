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
        note.parent(null);
        self.subnotes.remove(note);
        return note;
    };
    /**
     * @method
     * Moves sub-note to another position 
     */
    self.moveSubnote = function(note, opts, parent) {
        if (parent) {
            return parent.addSubnote(self.deleteSubnote(note), opts);
        } else {
            return self.addSubnote(self.deleteSubnote(note), opts);
        }
    }
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
            if (event.shiftKey) {//new sub-note
                if (!self.isOpen()) self.toggleOpen();
                self.addSubnote(null, {position:0}).startEdit();
            } else {//new sibling note
                note.parent().addSubnote(null, {after:note}).startEdit();
            }
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
        //If the cursor is at the beginning, delete the note. It is not actually
        //deleted, it is marked with a property named _destroy set to true.
        } else if (event.which == 8) {//Backspace
            if ((event.target.selectionStart==event.target.selectionEnd) && (event.target.selectionEnd==0)) {
                note.parent().deleteSubnote(note);
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
    self.zoomIn = function(note, event) {
        if (self.rootNote() == note) return;
        if (self.rootNote()) {
            self.rootNote().isZoomedIn(false);
        };
        self.rootNote(note);
        note.isZoomedIn(true);
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
    return this;
};