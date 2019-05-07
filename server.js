'use strict';
var WebTorrent = require('webtorrent');
var ipInfo = require("ipinfo");
var client = new WebTorrent();
var atob = require("atob");
var whois = require('whois-2');
var magnetC = require('magnet-uri');


var express = require('express');
var app = express();
var port = 3000;

var MongoClient = require('mongodb').MongoClient;
var url = "mongodb://localhost:27017/";
var request = require('request');
app.use(express.static('public'));


app.get('/magnet/:magnet', function (req, res) {
req.setTimeout(5000);
var userMagnet = req.params.magnet;
var twoo = "magnet:?xt=urn:" + userMagnet;
console.log(twoo);
client.on('error', function (err) {
  console.error(err.stack)
})

client.add(twoo, function (torrent) {
    torrent.on('wire', function (wire, addr) {
        //console.log('connected to peer with address ' + addr)
        var spliter = addr.split(":");
        var urlNew = 'http://ip-api.com/json/'+spliter[0];
        MongoClient.connect(url, function(err, db) {
        var dbo = db.db("trackersniffer");
        var query = { ipaddress: spliter[0] };
        dbo.collection("peerinfo").find(query).toArray(function(err, result) {
          if (err) throw err;
          if(result.length == 0){
            request.get({
                url: urlNew,
                json: true,
                headers: {'User-Agent': 'request'}
                }, (err, res, data) => {
            if (err) {
              console.log('Error:', err);
            } else if (res.statusCode !== 200) {
              console.log('Status:', res.statusCode);
            } else {
                if (err) throw err;
                var dbo = db.db("trackersniffer");
                var query = { ipaddress: data.query, magnet:twoo };
                dbo.collection("peerinfo").find(query).toArray(function(err, result) {
                  if (err) throw err;
                  if(result.length == 0){
                    var parsedMagnet = magnetC.decode(twoo);
                    var myobj = { title: parsedMagnet.dn, magnet:twoo, ipaddress: data.query, country: data.country, region: data.region, as:data.as, isp:data.isp, lat:data.lat, lon:data.lon };
                    dbo.collection("peerinfo").insertOne(myobj, function(err, res) {
                        if (err) throw err;
                        console.log("Inserted a peer info!");
                        db.close();
                  });
                  }
                  else{
                    db.close();
                  }
                });
            }
            });
          }
          else{
            console.log("This IP already exists good bye!")
            db.close();
          }
        });
    })
});
});
});

app.get('/find/:magnet/:cs', function (req, res) {
var localMagnet = req.params.magnet;
var localCountry = req.params.cs;
var localMongoMagnet = "magnet:?xt=urn:" + localMagnet;

MongoClient.connect(url, function(err, db) {
  if (err) throw err;
  var dbo = db.db("trackersniffer");
  var query;
  if(localCountry == 1){
  country="India";
  var country; 
  query = { magnet: localMongoMagnet, country:country};
  }
  else{
  query = { magnet: localMongoMagnet };
  }

  dbo.collection("peerinfo").find(query).toArray(function(err, result) {
    if (err) throw err;
    res.send(result);
    db.close();
  });
});
});

app.listen(port, () => console.log(`Tracker Sniffer AP running on port ${port}!`))