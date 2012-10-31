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

    /**
     * Main application properties. 
     */
    self.rootNote     = null; //reference to the "virtual" top-most note
    self.listView     = null; //reference to the main view
    self.deletedNotes = ko.observableArray([]); //array of deleted notes that
                                                //is used as stack for undo
    
    /**
     * @method
     * Initialises instance if Notes application.
     *   1. Creates instances of root note and main view and applyes knockoutjs
     *      bindings;
     *   2. Loads all notes from the server;
     *   3. Initialises jQuery UI dialogues;
     *   4. Setups regular sync with the server.
     */
    self.init = function() {
        // Create the root note and initialise bindings.
        self.rootNote = new NoteModel({content:"Home"});
        self.listView = new NotesListViewModel(self.rootNote)
        ko.applyBindings(self, document.getElementById("content"));
        
        // Load notes from the server.
        $("#root").mask("Loading notes...", 300);
        $.getJSON("/note/list/", function(data){
            self.rootNote.loadSubnotes(data);
            $("#root").unmask();
            if (self.rootNote.hasSubnotes()) {
                self.rootNote.subnotes()[0].startEdit();
            }
        })
        .error(function(res) {
            $("#root").unmask();
            app.showErrorPopup("Error occured while loading notes from the server.");
        });
        
        // Setup global keyboard shortcuts.
        // numpad '+': create new note
        $('body').on('keydown', function(event){
            if (event.which==107) {
                self.rootNote.addSubnote().startEdit();
                return false;
            }
            return true;
        });
        
        // Initialise common dialogues.
        // Help dialogue
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

        // Error dialogue
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
        
        // Export dialogue
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
        
        // Settings dialogue
        $("#settings-dialog").dialog({
            autoOpen: false,
            buttons: [{
                text: "Close",
                click: function(){$(this).dialog("close");}
            }],
            modal: false,
            resizable: true,
            dialogClass: "common-dialog",
            width: 400,
            height: 300
        });
        // Font style dropdown
        $("#current-style").css({width:"80px"})
        .button({ //button with triangle on the right
            text: true,
            icons: {
                primary: "ui-icon-script",
                secondary: "ui-icon-triangle-1-s"
            }
        })
        .click(function(){//show dropdown list on click
            var menu = $( this ).next().toggle().width(80).position({
                my: "left top",
                at: "left bottom",
                of: this
            });
            $( document ).one( "click", function() { //close dropdown
                menu.hide();
            });
            return false;
        })
        .next() //dropdown markup must be straight after button markup
        .hide() //initially hide the dropdown
        .menu(); //initialise jQuery UI menu control

        // Main menu buttons
        $("#main-menu .button-undo").button({
            icons: {
                primary: "ui-icon-arrowrefresh-1-s"
            }
        });
        $("#main-menu .button-user").button({
            icons: {
                primary: "ui-icon-person",
                secondary: "ui-icon-triangle-1-s"
            }
        })
        .click(function(){
            var menu = $( this ).next().toggle().width(80).position({
                my: "right top",
                at: "right bottom",
                of: this
            });
            $( document ).one( "click", function() {
                menu.hide();
            });
            return false;
        })
        .next()
        .hide()
        .menu();

        //Start regular server sync
        setInterval(self.syncWithServer, 5000);
    };
    
    /**
     * @method
     * Restores previously deleted note (if any).
     */
    self.undo = function() {
        if (self.deletedNotes().length > 0) {
            var note = self.deletedNotes.pop();
            note.parent().addSubnote(note, {position: note.position()});
            note.remoteRestore();
        }
    };
    
    /**
     * @method
     * Synchronises with the server.
     * At the moment only two actions are synchronised - create and update.
     * Delete, restore and move actions are called straight away. This introduces
     * a few problems, but I will deal with them later.
     */
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
    
    /**
     * @method
     * Open Help dialogue.
     */
    self.showHelpDialog = function() {
        $("#help-dialog").dialog("open");
    };
    
    /**
     * @method
     * Open Error dialogue.
     * @param {string} errMsg Error message to show.
     */
    self.showErrorDialog = function(errMsg) {
        $("#error-dialog .error-message").text(errMsg);
        $("#error-dialog").dialog("open");
    };

    /**
     * @method
     * Shows small popup box with error message at the top and the hides it.
     * @param {string} errMsg Error message to show.
     */
    self.showErrorPopup = function(errMsg) {
        $("#error-popup .error-message").text(errMsg);
        $("#error-popup").show("slow");
        setTimeout(function(){$("#error-popup").hide("slow")}, 3000);
    };
    
    /**
     * @method
     * Stub for "search by tag" functionality.
     * @param {string} tag Tag to search by.
     */
    self.searchTag = function(tag) {
        self.showErrorDialog("You tried to search for notes with '"+tag+"' tag. Unfortunately this function is not implemented yet.");
    };

    /**
     * @method
     * Show print preview (at least in Chrome). In other browsers will probably
     * open Print dialogue.
     */
    self.printPreview = function() {
    	window.print();
    };
    
    /**
     * @method
     * Show Export dialogue.
     */
    self.exportNotes = function() {
        function print_note(note, indent) {
            var res = " * " + note.content();
            if (note.hasSubnotes()) {
                $.each(note.subnotes(), function(idx, val){
                    res = res + "\n" + indent +print_note(val,indent+"\t");
                });
            }
            return res;
        };
        var indent = "\t";
        var output = print_note(self.listView.rootNote(), indent);
        $("#export-content").text(output);
        $("#export-dialog").dialog("open");
        $("#export-content").select();        
    };
    
    /**
     * @method
     * Sets active CSS style sheet by title. The idea is described here:
     * http://www.alistapart.com/articles/alternate/
     */
    self.setActiveStyleSheet = function(title) {
        var i, a, main;
        for(i=0; (a = document.getElementsByTagName("link")[i]); i++) {
            if(a.getAttribute("rel").indexOf("style") != -1 && a.getAttribute("title")) {
                a.disabled = true;
                if(a.getAttribute("title") == title) a.disabled = false;
            }
        }
    };
    
    /**
     * @method
     * Show Settings dialogue.
     */
    self.showSettingsDialog = function() {
        $("#settings-dialog").dialog("open");
    };
    
    return self;
};
