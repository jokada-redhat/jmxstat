@echo off
set BASEDIR=%~dp0

set CLASSPATH=%EAP_HOME%\bin\client\jboss-cli-client.jar

jrunscript -cp "%CLASSPATH%" "%BASEDIR%jmxstat.js" "%BASEDIR%jmxstat.config"
