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
    self.hasSubnotes = ko.computed(function() {
                        return self.subnotes().length > 0;
                       }, self);
    self.hash        = ko.computed(function() {
                        return "#" + self.id(); 
                       }, self);
    self.isOpen      = ko.observable(data.isOpen || false);
    self.isInEdit    = ko.observable(false);
    //add subnotes creating new instances of NoteModel if necessary
    $.each(data.subnotes || [], function(idx, val) {
        if (val instanceof NoteModel) {
            self.subnotes.push(val);
        } else {
            self.subnotes.push(new NoteModel(val));
        };
    });

    /**
     * Note model methods.
     */
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
        if (event.which == 13) { //enter or shift+enter
            if (event.shiftKey) {
                var n = new NoteModel({});
                self.subnotes.push(n);
                if (!self.isOpen()) self.toggleOpen();
                n.startEdit();
            } else {
                var parent = ko.contextFor(event.target).$parent;
                if (parent instanceof NoteModel) {
                    var n = new NoteModel({});
                    var i = parent.subnotes.indexOf(note);
                    parent.subnotes.splice(i+1, 0, n);
                    n.startEdit();
                } else {
                    var n = new NoteModel({});
                    var i = parent.notes.indexOf(note);
                    parent.notes.splice(i+1, 0, n);
                    n.startEdit();
                }
            }
        } else if ((event.which == 40) && (event.target.textLength-event.target.selectionStart==0)) { //key down
            var el = $(event.target);
            var nextEl = el.nextInDocument(".content:visible");
            if (nextEl[0]) {
                ko.dataFor(nextEl[0]).startEdit();
            }
        } else if ((event.which == 38) && (event.target.selectionEnd==0)) { //key up
            var parents = ko.contextFor(event.target).$parents;
            var p = parents.length;
            for (var p = 0;p<parents.length;p++) {
                if (parents[p] instanceof NoteModel) {
                    var i = parents[p].subnotes.indexOf(note);
                    if (parents[p].subnotes()[i-1]) {
                        parents[p].subnotes()[i-1].startEdit();
                        break;
                    } else {
                        if (parents[p].hasSubnotes()) {
                            parents[p].subnotes()[parents[p].subnotes.length-1].startEdit();
                        } else {
                            parents[p].startEdit();
                        }
                        break;
                    }
                } else {
                    var i = parents[p].notes.indexOf(note);
                    if (parents[p].notes()[i-1]) {
                        parents[p].notes()[i-1].startEdit();
                        break;
                    };
                };
            };
        } else {
            return true;
        };
    };
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
     * NotesListView model methods.
     */
    /**
     * @method
     * Add a new note to the list.
     */
    self.addNote = function(note) {
        self.notes.push(new NoteModel(note));
    };
    /**
     * @method
     * Create an empty note and add it to the list.
     */
    self.newNote = function(parent) {
        var n = new NoteModel({});
        if (parent instanceof NoteModel) {
            parent.subnotes.push(n);
        } else {
            self.notes.push(n);
        };
        n.startEdit();
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
        $(".top-level > div").unwrap();
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
    };
    /**
     * @method
     * Zoom out of a note to the root
     */
    self.zoomOut = function() {
        self.breadcrumbs.removeAll();
        $(".note").hide();
        $(".top-level > div").unwrap();
        $(".note").show("fast");
    }
};