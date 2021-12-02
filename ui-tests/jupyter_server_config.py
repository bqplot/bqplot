from tempfile import mkdtemp

c.ServerApp.port = 8888
c.ServerApp.token = ""
c.ServerApp.password = ""
c.ServerApp.disable_check_xsrf = True
c.ServerApp.open_browser = False
c.ServerApp.root_dir = mkdtemp(prefix='galata-test-')

c.LabApp.expose_app_in_browser = True
