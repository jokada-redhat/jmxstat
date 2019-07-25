#!/bin/sh
BASEDIR=$(dirname $0)
case "`uname`" in
  CYGWIN*) BASEDIR=`cygpath -w "${BASEDIR}"`
           ;;
esac

# Read an optional running configuration file
if [ "x$RUN_CONF" = "x" ]; then
    RUN_CONF="$BASEDIR/jmxstat.conf"
fi
if [ -r "$RUN_CONF" ]; then
    . "$RUN_CONF"
fi

if [ "x${EAP_HOME}" == "x" ]; then
    echo "Error: Please set environment variable EAP_HOME."
    exit 1
elif [ $# -lt 1 ]; then
    echo "Usage: `basename $0` <metrics-config>"
    exit 1
fi

CONFIG=$1
CLASSPATH=${EAP_HOME}/bin/client/jboss-cli-client.jar

# Setup the 'JRUNSCRIPT'
if [ "x$JRUNSCRIPT" = "x" ]; then
    if [ "x$JAVA_HOME" != "x" ]; then
        JRUNSCRIPT="$JAVA_HOME/bin/jrunscript"
    else
        JRUNSCRIPT="jrunscript"
    fi
fi

$JRUNSCRIPT -cp "$CLASSPATH" -f "${BASEDIR}/jmxstat.js" "${BASEDIR}/${CONFIG}"
