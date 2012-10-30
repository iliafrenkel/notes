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
        
        // Initialise common dialogues
        $("#help-dialog").dialog({
            autoOpen: false,
            buttons: [{
                text: "Close",
                click: function(){$(this).dialog("close");}
            }],
            modal: false,
            resizable: false,
            dialogClass: "common-dialog",
            width: 700,
            height: 650
        });
        $("#help-tabs").tabs();

        $("#error-dialog").dialog({
            autoOpen: false,
            buttons: [{
                text: "Close",
                click: function(){$(this).dialog("close");}
            }],
            modal: true,
            resizable: false,
            dialogClass: "common-dialog",
            width: 400
        });
        
        $("#export-dialog").dialog({
            autoOpen: false,
            buttons: [{
                text: "Close",
                click: function(){$(this).dialog("close");}
            }],
            modal: true,
            resizable: true,
            dialogClass: "common-dialog",
            width: 600,
            height: 400
        });
        
        //Start regular server sync
        setInterval(self.syncWithServer, 5000);
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
    
    self.showHelpDialog = function() {
        $("#help-dialog").dialog("open");
    };
    
    self.showErrorDialog = function(errMsg) {
        $("#error-dialog .error-message").text(errMsg);
        $("#error-dialog").dialog("open");
    };

    self.showErrorPopup = function(errMsg) {
        $("#error-popup .error-message").text(errMsg);
        $("#error-popup").show("slow");
        setTimeout(function(){$("#error-popup").hide("slow")}, 3000);
    };    
    
    self.searchTag = function(tag) {
        self.showErrorDialog("You tried to search for notes with '"+tag+"' tag. Unfortunately this function is not implemented yet.");
    };

    self.printPreview = function() {
    	window.print();
    };
    
    self.exportNotes = function() {
        function print_note(note, indent) {
            var res = " * " + note.content();
            if (note.hasSubnotes()) {
                //res = res + "\n";
                $.each(note.subnotes(), function(idx, val){
                    res = res + "\n" + indent +print_note(val,indent+"\t");
                });
                //res = res + "\n";
            }
            return res;
        };
        var indent = "\t";
        var output = print_note(self.listView.rootNote(), indent);
        $("#export-content").text(output);
        $("#export-dialog").dialog("open");
        $("#export-content").select();        
    };
    
    self.setActiveStyleSheet = function(title) {
        var i, a, main;
        for(i=0; (a = document.getElementsByTagName("link")[i]); i++) {
            if(a.getAttribute("rel").indexOf("style") != -1 && a.getAttribute("title")) {
                a.disabled = true;
                if(a.getAttribute("title") == title) a.disabled = false;
            }
        }
    };
    
    return self;
};
