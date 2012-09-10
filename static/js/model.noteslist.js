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
        if (i >= 0) {
            self.addSubnote(subNote, i+1);
        }
    };
    /**
     * @method
     * Delete a subnote.
     */
    self.deleteSubnote = function(subNote) {
        self.subnotes.destroy(subNote);
    };
    /**
     * @method
     * Returns next note (if any).
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
            var parent = ko.contextFor(event.target).$parent;
            if (parent instanceof NoteModel) {
                var i = parent.subnotes.indexOf(note) - 1;
                if (i >= 0) { //we have siblings
                    var prevNoteEl = $("#" + parent.subnotes()[i].id()).find("div.content:visible").last();
                    var prevNote = ko.dataFor(prevNoteEl[0]);
                    if (prevNote) prevNote.startEdit();
                } else {
                    parent.startEdit();
                }
            } else if (parent instanceof NotesListViewModel) {
                var i = parent.notes.indexOf(note) - 1;
                if (i >= 0) {
                    var prevNoteEl = $("#" + parent.notes()[i].id()).find("div.content:visible").last();
                    var prevNote = ko.dataFor(prevNoteEl[0]);
                    if (prevNote) prevNote.startEdit();
                } else {
                    return true;
                }
            }
        //TAB or SHIFT+TAB
        //On TAB increase the level of the note (if possible). On SHIFT+TAB
        //decrease the level (if possible).
        } else if (event.which == 9) {//Tab
            if (note.isZoomedIn()) return;
            var parent = ko.contextFor(event.target).$parent;
            if (parent instanceof NoteModel) {
                if (event.shiftKey) {
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
    
    /**
     * Array of deleted notes. Used for undo.
     */
    self.deletedNotes = [];

    /**
     * NotesListView model methods.
     */
    /**
     * @method
     * Add a new note to the list.
     */
    self.addNote = function(note) {
        if (note instanceof NoteModel) {
            self.notes.push(note);
        } else {
            self.notes.push(new NoteModel(note));
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
        if (i >= 0) {
            self.notes.splice(i+1, 0, note);
        }
    };
    /**
     * @method
     * Delete a note.
     */
    self.deleteNote = function(note) {
        if (note.parent()) {
            note.parent().deleteSubnote(note);
        } else {
            self.notes.destroy(note);
        }
        self.deletedNotes.push(note);
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
        var noteEl = $("#" + note.id()); //note DIV
        //hide the note
        noteEl.hide("fast");
        //"un-zoom" previously zoomed in note
        if ($(".top-level > div")[0]) {
            var prevNote = ko.dataFor($(".top-level > div")[0]);
            if (prevNote) prevNote.isZoomedIn(false);
            $(".top-level > div").unwrap();
        }
        //update breadcrumbs
        self.breadcrumbs.removeAll();
        $.each(noteEl.parents(".note"), function(idx, val) {
            var n = ko.dataFor(val);
            var h = "#" + n.id();
            var t = n.content();
            self.breadcrumbs.unshift({hash:h,text:t,note:n});
        });
        //add the note to breadcrumbs
        self.breadcrumbs.push({hash:null,text:note.content()});        
        //"zoom" in to the note
        noteEl.wrap('<div class="top-level" />');
        noteEl.show("fast");
        //expand self if needed
        if (!note.isOpen()) note.toggleOpen();
        note.isZoomedIn(true);
    };
    /**
     * @method
     * Zoom out of a note to the root
     */
    self.zoomOut = function() {
        var note = ko.dataFor($(".top-level > div")[0]);
        if (note) note.isZoomedIn(false);
        self.breadcrumbs.removeAll();
        $(".note").hide();
        $(".top-level > div").unwrap();
        $(".note").show("fast");
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
                var droppedNoteParent = ko.contextFor(ui.draggable[0]).$parent;
                var droppedNoteParentSubnotes = (droppedNoteParent instanceof NoteModel) ? droppedNoteParent.subnotes : droppedNoteParent.notes;
                var originalIdx = droppedNoteParentSubnotes.indexOf(droppedNote);
                var isAbove = $(this).hasClass("above");
                //add note to the new place
                var receivingNoteParent = ko.contextFor(this).$parent;
                var subnotes = (receivingNoteParent instanceof NoteModel) ? receivingNoteParent.subnotes : receivingNoteParent.notes;
                var i = subnotes.indexOf(receivingNote); 
                if (isAbove) { //add above receiving note
                    subnotes.splice(i,0,droppedNote);
                    //remove note from original place
                    droppedNoteParentSubnotes.splice(originalIdx+1,1);
                } else { //add below receiving note
                    subnotes.splice(i+1,0,droppedNote);
                    //remove note from original place
                    droppedNoteParentSubnotes.splice(originalIdx,1);
                }
            }
        });
    };
    
    return this;
};