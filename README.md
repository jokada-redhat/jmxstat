# jmxstat: JMX metrics collecting tool

## Preface

The jmxstat is used for collecting JMX metrics of multiple remote EAP or JDG servers.

The script is written in JavaScript and runs with **jrunscript** (or jjs) included in JDK. The reason why I choose JavaScript is implementaion simplicity and ease of customization.

The jmxstat has the following features to fit the production environment:

* Metrics of multiple remote servers can be collected from single client host.
* JMX query invocations to multiple servers are processed concurrently and all metrics are collected in fork/join pattern. In this way, the delay of metrics output is minimized.
* The internal nested concurrent processing is simplified implementation using Java 8 parallel stream API. It is easily customizable.
* The script is continued to run like daemon process and collecting the metrics periodically with specified interval time. Even if the target servers are stopped, you don't need to restart the jmxstat script. It will try to reconnect the target servers and continue to collect metrics after the servers comes back. In order to minimize the server load, jmxstat caches and reuses the established JMX connections.
* You can customize the configuration file, which defines MBean names and attributes that you want. The wild card (* or ?) is available for MBean name in the configuration file.

## Files

The structure of this tools is as follows:

~~~
.
├── jmxstat.sh*                   The sh script for jmxstat (for Linux)
├── jmxstat.bat                   The bat script for jmxstat (for Windows)
├── jmxstat.js                    The main part of jmxstat implementation
└── config/
    ├── cachestats_jdg6.config    Configuration file for JDG6 cache status
    ├── cachestats_jdg7.config    Configuration file for JDG7 cache status
    ├── jvm.config                Configuration file for JVM
    ├── replication_jdg6.config   Configuration file for JDG6 replication status
    └── replication_jdg7.config   Configuration file for JDG' replication status
~~~

## Configuration file (config/*.config)

The configuration file for jmxstat is JavaScript syntax. It defines JMX connection parameters and the metrics specification.
Please change each settings for your environment.

The following is the sample definition for JVM metrics.

config/jvm.config:

~~~
// Server list for collecting JMX metrics.

var servers = [
        "localhost:9999", "localhost:10099", "localhost:10199", "localhost:10299"
]

// JMX protocol. EAP6, JDG6: "remoting-jmx", EAP7 or JDG7: "remote+http" (or "http-remoting-jmx")

var jmx_protocol = "remoting-jmx"
//var jmx_protocol = "remote+http"

// Authentication info: username and password.

var username = "admin"
var password = "welcome1!"

// Interval time (sec) for collecting metrics.

var interval_sec = 5

// Field delimiter for output results
//
//var delimiter = ","
var delimiter = " "

// Collecting metrics: MBean name and attributes.

var metrics = [
    { mbean : "java.lang:type=GarbageCollector,*",
      attrs : [ "CollectionCount", "CollectionTime" ]
    },
    { mbean : "java.lang:type=MemoryPool,*",
      attrs : [ "Usage.max", "Usage.used" ]
    }
]
~~~

## How to use jmxstat

First of all, you must define the environment variable EAP_HOME.

~~~
$ export JDG_HOME=/opt/jboss/jboss-datagrid-6.5.1-server
~~~

The jmxstat requires Java 8. Check JDK version like this.

~~~
$ java -version
java version "1.8.0_65"
Java(TM) SE Runtime Environment (build 1.8.0_65-b17)
Java HotSpot(TM) 64-Bit Server VM (build 25.65-b01, mixed mode)
~~~

In order to run jmxstat, execute the script with configuration file name as the parameter.

~~~
$ ./jmxstat.sh
Usage: jmxstat.sh <metrics-config>

$ ./jmxstat.sh config/jvm.config

Date       Time     Server               Stat "PS MarkSweep.CollectionCount" "PS MarkSweep.CollectionTime" "PS Scavenge.CollectionCount" "PS Scavenge.CollectionTime" "PS Eden Space.Usage.max" "PS Eden Space.Usage.used" "PS Old Gen.Usage.max" "PS Old Gen.Usage.used" "PS Perm Gen.Usage.max" "PS Perm Gen.Usage.used" "Code Cache.Usage.max" "Code Cache.Usage.used" "PS Survivor Space.Usage.max" "PS Survivor Space.Usage.used"
2015-11-24 21:53:11 localhost:9999         OK 0 0 4 608 342884352 322224984 911212544 32768 268435456 62911112 100663296 16602240 56623104 22544904
2015-11-24 21:53:12 localhost:10099        OK 0 0 4 508 342884352 245318184 911212544 40960 268435456 62421880 100663296 15755840 56623104 22823392
2015-11-24 21:53:16 localhost:9999         OK 0 0 4 608 342884352 322733464 911212544 32768 268435456 62911112 100663296 16623296 56623104 22544904
2015-11-24 21:53:16 localhost:10099        OK 0 0 4 508 342884352 245872280 911212544 40960 268435456 62421880 100663296 15755840 56623104 22823392
			:
~~~

The metrics results are periodically displayed with specified **interval_sec** in the configuration file.
To stop the script, type Ctrl-C or send kill signal to this process.
