// Check Java version >= 1.8
if (java.lang.System.getProperty("java.specification.version") < "1.8") {
    println("Error: Java 8 is required.")
    exit(1)
}
// Load java 7 compatible global objects.
load("nashorn:mozilla_compat.js")

importPackage(java.lang)
importPackage(java.nio.file)
importPackage(java.text)
importPackage(java.util)
importPackage(java.util.concurrent)
importPackage(java.util.stream)
importPackage(javax.management)
importPackage(javax.management.remote)

// Check arguments.
if (arguments.length != 1) {
    println("Usage: jrunscript jmxstat.js jmxstat.config")
    exit(1)
}
var config = arguments[0]
// Load config (servers, username, password, interval_sec, metrics).
load(config)

// Set concurrency level for Java 8 parallel stream.
System.setProperty("java.util.concurrent.ForkJoinPool.common.parallelism", servers.length)

// Prepare empty JMX connectorMap.
var connectorMap = new ConcurrentHashMap()
servers.forEach(function(server) connectorMap.put(server, Optional.ofNullable(null)))

// Print Header
printHeader()

// Start metrics collection.
var timer = new ScheduledThreadPoolExecutor(1)
timer.scheduleAtFixedRate(task, 1, interval_sec, TimeUnit.SECONDS)

// Wait forever
while (true) { sleep(Integer.MAX_VALUE) }

function printHeader() {
    // Parallel accessing all servers using java8 stream APIs.
    Arrays.asList(servers).stream().map(function(server) {
        try {
            if (!connectorMap[server].isPresent()) {
                // Try to reconnect.
                connectorMap[server] = Optional.of(getJMXConnector(server, username, password))
            }   
            var con = connectorMap[server].get().getMBeanServerConnection()
            var results = Arrays.asList(metrics).stream().map(function(metric) {
                var query = new ObjectName(metric.mbean)
                return con.queryNames(query, null).stream().map(function(objname) {
//                    var name = con.getAttribute(objname, "Name")
                    var name = objname.getKeyProperty("name").replaceAll("\"", "")
                    if (objname.getKeyProperty("component") != null) {
                        // Sub-component name is added to MBean name.
                        name += "."+objname.getKeyProperty("component")
                    }
                    return Arrays.asList(metric.attrs).stream().map(function(attr) {
                        // Return "<MBean name>.<attr name>" as a header.
                        return '"'+name+'.'+attr+'"'
                    }).collect(Collectors.joining(delimiter)) 
                }).collect(Collectors.joining(delimiter)) 
            }).collect(Collectors.joining(delimiter)) 
            return Optional.of(java.lang.String.format("%-10s%s%-8s%s%-20s%s%-4s%s%s%n",
                "Date", delimiter, "Time", delimiter, "Server", delimiter, "Stat", delimiter, results))
        } catch (e) {
            // Clean up connectionMap entry.
            if (connectorMap[server].isPresent()) {
                connectorMap[server].get().close()
                connectorMap[server] = Optional.ofNullable(null)
            } 
            return Optional.ofNullable(null)
        }   
    }).filter(function(o) o.isPresent()).limit(1).forEach(function(o) System.out.print(o.get()))
}

function task() {
    // Parallel accessing all servers using java8 stream APIs.
    Arrays.asList(servers).parallelStream().map(function(server) {
        try {
            if (!connectorMap[server].isPresent()) {
                // Try to reconnect.
                connectorMap[server] = Optional.of(getJMXConnector(server, username, password))
            }   
            var con = connectorMap[server].get().getMBeanServerConnection()
            var results = Arrays.asList(metrics).stream().map(function(metric) {
                var query = new ObjectName(metric.mbean)
                return con.queryNames(query, null).stream().map(function(objname) {
                    return Arrays.asList(metric.attrs).stream().map(function(attr) {
                         var val = null
                         var tokens = attr.split(".")
                         if (tokens.length == 1) {
                             var val = con.getAttribute(objname, attr)
                         } else {
                             var comp = con.getAttribute(objname, tokens[0])
                             val = comp.get(tokens[1])
                         }
                         return val == null ? "null" : val.toString()
                    }).collect(Collectors.joining(delimiter))
                }).collect(Collectors.joining(delimiter))
            }).collect(Collectors.joining(delimiter))
            return java.lang.String.format("%-19s%s%-20s%s%-4s%s%s%n",
                    dateTime(), delimiter, server, delimiter, "OK", delimiter, results)
        } catch (e) {
            // Clean up connectionMap entry.
            if (connectorMap[server].isPresent()) {
                connectorMap[server].get().close()
                connectorMap[server] = Optional.ofNullable(null)
            }   
            return java.lang.String.format("%-19s%s%-20s%s%-4s%s%s%n",
                    dateTime(), delimiter, server, delimiter, "NG", delimiter, '"'+e+'"')
        }
    }).forEachOrdered(function(s) System.out.print(s))
}

function dateTime() {
    var fmt = new SimpleDateFormat("yyyy-MM-dd"+delimiter+"HH:mm:ss")
    return fmt.format(new java.util.Date())
}

function getJMXConnector(server, username, password) {
    var url = new JMXServiceURL("service:jmx:"+jmx_protocol+"://" + server)
    var cls = new java.lang.String().getClass()
    var cred = java.lang.reflect.Array.newInstance(cls, 2)
    cred[0] = username
    cred[1] = password
    var env = {"jmx.remote.credentials" : cred}
    return JMXConnectorFactory.connect(url, env)
}

function sleep(sec) {
    try { java.lang.Thread.sleep(sec*1000) } catch (e) {}
}

