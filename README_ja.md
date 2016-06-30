# JMXメトリック取得スクリプトについて

## はじめに

このスクリプトは、EAPサーバやJDGサーバにおける各種の状態をJMX APIを利用して取得します。

JMX APIはJavaのAPIであるため、通常Javaのプログラムを用意し、コンパイルしたクラスを用意した上で実行するのが一般的ですが、JDKには**jrunscript** (またはjjs)というJavaScriptシンタックスのスクリプト言語ランタイムのツールが含まれています。このjrunscriptコマンドを使用することにより、Java APIを使用した簡単なプログラムであれば、JavaScript表記のスクリプトファイルを用意しておき、予めコンパイルすることなく、直接スクリプトファイルの内容を実行することが出来ます。このスクリプトはjrunscriptを使用したJavaScript形式のスクリプトファイルとして作成されています。

なお、今回のスクリプトは、プロダクション環境でも使用できるよう、以下の特徴を持っています。

* 一カ所のホスト上で起動したスクリプトから、複数ホスト上で起動している全てのサーバインスタンスのメトリックを取得できるようにしています。
* 複数のサーバインスタンスへのJMX問合せを並列に行い、fork/joinのパターンで収集したメトリックを出力するため、サーバインスタンスの数が多くなってもメトリック出力の遅延は最小限になるようになっています。また、並列処理にはJava 8で追加されたStream APIを併用しているため、簡潔な記述にすることが出来ています。
* このスクリプトはデーモンのように常駐し、予め設定された周期でサーバインスタンスのメトリックを取得するようになっています。このとき、サーバインスタンスが障害やメンテナンスで停止した場合でも、このスクリプトのツールを再起動する必要はありません。停止中でメトリックが取得できないサーバの情報は、Stat="NG"として表示し、次のメトリック取得のタイミングで、該当のサーバインスタンスへの再接続を試みます。なお、性能重視のため、通常は健全に動作しているサーバインスタンスへのJMX接続をキャッシュし、再利用することで、サーバインスタンスへの負荷を最小限にしています。

## サンプルスクリプトの構成

本スクリプトは、以下のファイル構成となっています。

* jmxstat.sh: スクリプトファイル(.js)を簡易に起動するためのshスクリプト。Linux環境でご利用ください。
* jmxstat.bat: スクリプトファイル(.js)を簡易に起動するためのbatファイル。Windows環境用です。
* jmxstat.js: サンプルスクリプト本体です。全てのロジックはこのファイルに記述されています。JavaScript形式です。
* *.config: 環境設定ファイル。利用する環境に応じて変更する設定ファイルです。jmxstat.jsから読み込まれます。JavaScript形式です。

## 設定ファイル(jmxstat.config)

環境に応じて変更することができる設定値は別途コンフィグファイルに記述します。ご利用の環境に応じて、各種の設定値を変更してからスクリプトを実行してください。以下にJVMのGCとメモリ使用状況のメトリックを取得する場合のjvm.configの例を示します。

~~~
// Server list for collecting JMX metrics.

var servers = [
        "localhost:9999", "localhost:10099", "localhost:10199", "localhost:10299"
]

// JMX protocol. EAP6, JDG6: "remoting-jmx" (or "remote"), EAP7 or JDG7: "remote+http" (or "http-remoting-jmx")

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

## jmxstatの実行方法

スクリプトを実行する前に、環境変数JDG_HOMEを設定してください。

~~~
$ export JDG_HOME=/opt/jboss/jboss-datagrid-6.5.1-server
~~~

また、このスクリプトはJava 8のJDKを必要とします。以下のコマンドを実行し、JDKのバージョンが1.8.0であることを確認してください。

~~~
$ java -version
java version "1.8.0_65"
Java(TM) SE Runtime Environment (build 1.8.0_65-b17)
Java HotSpot(TM) 64-Bit Server VM (build 25.65-b01, mixed mode)
~~~

上記の確認が終わったら、jmxstat.shコマンドにコンフィグファイルを指定して実行してください。標準出力にコンフィグファイルのmetrics変数に定義したMBeanの属性値をスペース区切りの表形式で標準出力に出力します。

~~~
Date       Time     Server               Stat "PS MarkSweep.CollectionCount" "PS MarkSweep.CollectionTime" "PS Scavenge.CollectionCount" "PS Scavenge.CollectionTime" "PS Eden Space.Usage.max" "PS Eden Space.Usage.used" "PS Old Gen.Usage.max" "PS Old Gen.Usage.used" "PS Perm Gen.Usage.max" "PS Perm Gen.Usage.used" "Code Cache.Usage.max" "Code Cache.Usage.used" "PS Survivor Space.Usage.max" "PS Survivor Space.Usage.used"
2015-11-24 21:53:11 localhost:9999         OK 0 0 4 608 342884352 322224984 911212544 32768 268435456 62911112 100663296 16602240 56623104 22544904
2015-11-24 21:53:12 localhost:10099        OK 0 0 4 508 342884352 245318184 911212544 40960 268435456 62421880 100663296 15755840 56623104 22823392
2015-11-24 21:53:16 localhost:9999         OK 0 0 4 608 342884352 322733464 911212544 32768 268435456 62911112 100663296 16623296 56623104 22544904
2015-11-24 21:53:16 localhost:10099        OK 0 0 4 508 342884352 245872280 911212544 40960 268435456 62421880 100663296 15755840 56623104 22823392
~~~

出力はコンフィグファイルのinterval_sec秒間隔で行い、常駐したままメトリックスを取得し続けます。停止する場合は、Ctrl-Cまたはkillシグナルをこのプロセスに送信して終了させてください。

以上