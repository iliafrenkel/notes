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
    self.id          = ko.observable(data.id);
    self.content     = ko.observable(data.content);
    self.subnotes    = ko.observableArray([]);
    self.hasSubnotes = ko.computed(function() { return self.subnotes().length > 0; }, self);
    self.hash        = ko.computed(function() { return "#" + self.id(); }, self);
    
    self.isClosed    = ko.observable(data.isClosed || true);
    
    $.each(data.subnotes, function(idx, val) {
        self.subnotes.push(new NoteModel(val));
    });

    /**
     * Task model methods.
     */
    self.toggleOpen = function() {
        var self = this;
        self.isClosed(!self.isClosed());
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
    self.notes = ko.observableArray([]);
    /**
     * NotesListView model properties.
     */

    /**
     * NotesListView model methods.
     */
    self.addNote = function(data) {
        self.notes.push(new NoteModel(data));
    };
};