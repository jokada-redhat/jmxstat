#!/bin/sh
BASEDIR=$(dirname $0)
case "`uname`" in
  CYGWIN*) BASEDIR=`cygpath -w "${BASEDIR}"`
           ;;
esac

if [ "x${EAP_HOME}" == "x" ]; then
    echo "Error: Please set environment variable EAP_HOME."
elif [ $# -lt 1 ]; then
    echo "Usage: `basename $0` <metrics-config>"
else
CONFIG=$1
CLASSPATH=${EAP_HOME}/bin/client/jboss-cli-client.jar

jrunscript -cp "$CLASSPATH" -f "${BASEDIR}/jmxstat.js" "${BASEDIR}/${CONFIG}"

fi
