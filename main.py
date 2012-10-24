#
# Copyright 2012, Ilia Frenkel <frenkel.ilia@gmail.com>
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
from google.appengine.api import users
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
            if users.is_current_user_admin():
                admin_link = '&nbsp;|&nbsp;<a href="/_ah/admin/">Admin</a>'
            else:
                admin_link = ''
            template_values = {
                'user_nickname': users.get_current_user().nickname(),
                'logout_url': users.create_logout_url(self.request.uri),
                'admin_link': admin_link,
                'user_id': users.get_current_user().user_id()
            }
            self.response.out.write(template.render(template_values))
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
