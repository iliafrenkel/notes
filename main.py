#
# Copyright 2011, Ilia Frenkel <frenkel.ilia@gmail.com>
#
#  This program is free software: you can redistribute it and/or modify
#  it under the terms of the GNU General Public License as published by
#  the Free Software Foundation, either version 3 of the License, or
#  (at your option) any later version.
#
#  This program is distributed in the hope that it will be useful,
#  but WITHOUT ANY WARRANTY; without even the implied warranty of
#  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
#  GNU General Public License for more details.
#
#  You should have received a copy of the GNU General Public License
#  along with this program.  If not, see <http://www.gnu.org/licenses/>.

import webapp2
#from google.appengine.ext.webapp import template
from google.appengine.runtime import DeadlineExceededError

from controllers.note import NoteController

import jinja2
import os
import json

jinja_environment = jinja2.Environment(
    loader=jinja2.FileSystemLoader(os.path.dirname(__file__)))

class MainPage(webapp2.RequestHandler):
    
    def get(self):
        try:
            self.response.headers['Content-Type'] = 'text/html'
            template = jinja_environment.get_template('index.html')
            self.response.out.write(template.render({}))
        except DeadlineExceededError:
            self.response.clear()
            self.response.set_status(500)
            self.response.out.write("This operation could not be completed in time...")

application = webapp2.WSGIApplication([('/', MainPage),
                                       ('/note/(list|create|update|delete|restore|move)/(.*)', NoteController)], debug=True)


def main():
    run_wsgi_app(application)

if __name__ == "__main__":
    main()
