/* GYM.LOG Service Worker
   Bei jeder neuen Version die Zahl in CACHE erhöhen –
   dadurch wird der alte Zwischenspeicher verworfen. */
var CACHE = "gymlog-v6";

var SHELL = [
  "./",
  "./index.html",
  "./manifest.json?v=4",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-maskable-512.png",
  "./apple-touch-icon.png"
];

self.addEventListener("install", function(ev){
  ev.waitUntil(
    caches.open(CACHE).then(function(c){
      /* einzeln laden, damit eine fehlende Datei nicht alles blockiert */
      return Promise.all(SHELL.map(function(url){
        return c.add(url).catch(function(){ /* ignorieren */ });
      }));
    }).then(function(){ return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function(ev){
  ev.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.map(function(k){
        if(k!==CACHE) return caches.delete(k);
      }));
    }).then(function(){ return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function(ev){
  var req = ev.request;
  if(req.method!=="GET") return;

  var url = new URL(req.url);
  var isDoc = req.mode==="navigate" || /\.html?$/i.test(url.pathname);

  if(isDoc){
    /* Dokument: erst Netz (damit Updates ankommen), sonst Zwischenspeicher */
    ev.respondWith(
      fetch(req).then(function(res){
        var copy=res.clone();
        caches.open(CACHE).then(function(c){ c.put(req, copy); });
        return res;
      }).catch(function(){
        return caches.match(req).then(function(hit){
          return hit || caches.match("./index.html") || caches.match("./");
        });
      })
    );
    return;
  }

  /* Alles andere (Icons, Schriften): erst Zwischenspeicher, dann Netz */
  ev.respondWith(
    caches.match(req).then(function(hit){
      if(hit) return hit;
      return fetch(req).then(function(res){
        if(res && (res.status===200 || res.type==="opaque")){
          var copy=res.clone();
          caches.open(CACHE).then(function(c){ c.put(req, copy); });
        }
        return res;
      }).catch(function(){ return hit; });
    })
  );
});
