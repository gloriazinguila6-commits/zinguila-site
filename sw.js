/* Service Worker — ZINGUILA MULTI SERVICES
   Rend le site consultable hors connexion une fois visité/installé. */

var CACHE_VERSION = 'zms-v1';
var STATIC_CACHE = CACHE_VERSION + '-static';
var RUNTIME_CACHE = CACHE_VERSION + '-runtime';

/* Fichiers essentiels mis en cache dès l'installation */
var PRECACHE_URLS = [
  './',
  './index.html',
  './manifest.json',
  './logo.png',
  './icon-192.png',
  './icon-512.png',
  './hero_prets3.jpg',
  './brochure_zinguila.pdf',
  './r1_baie_vitree.jpg',
  './r2_soudure_atelier.jpg',
  './r3_chantier_hauteur.jpg',
  './r4_finition_interieure.jpg',
  './r5_equipe_site.jpg',
  './r6_ingenierie.jpg',
  './r7_grille_securite.jpg',
  './r8_fondation.jpg',
  './r9_mecanique_ferronnerie.jpg',
  './r10_mecanique_atelier.jpg',
  './r11_coulage_fondation.jpg',
  './r12_guerite_construction.jpg',
  './r13_guerite_finition.jpg',
  './r14_guerite_terminee.jpg',
  './r15_facade_carrelage.jpg',
  './r16_baie_vitree_alu.jpg',
  './r17_guerite_ronde.jpg',
  './r18_grille_decorative.jpg',
  './r19_fenetre_grille.jpg',
  './r20_menuiserie_armoire.jpg',
  './r21_menuiserie_armoire_int.jpg',
  './r22_cuisine_amenagee.jpg',
  './r23_menuiserie_meuble.jpg',
  './r24_cuisine_meuble.jpg',
  './r25_cuisine_sur_mesure.jpg',
  './r26_menuiserie_fenetres.jpg',
  './r27_garde_corps_vitre.jpg',
  './r28_baie_vitree_finition.jpg',
  './r29_armoire_coulissante.jpg',
  './r30_porte_aluminium.jpg'
];

/* Installation : on précharge les fichiers essentiels.
   Si une image manque/échoue, on n'annule pas toute l'installation. */
self.addEventListener('install', function(event){
  self.skipWaiting();
  event.waitUntil(
    caches.open(STATIC_CACHE).then(function(cache){
      return Promise.all(
        PRECACHE_URLS.map(function(url){
          return cache.add(url).catch(function(){
            /* on ignore les fichiers indisponibles plutôt que de bloquer l'install */
          });
        })
      );
    })
  );
});

/* Activation : on supprime les anciennes versions de cache */
self.addEventListener('activate', function(event){
  event.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(
        keys.filter(function(key){
          return key.indexOf(CACHE_VERSION) !== 0;
        }).map(function(key){
          return caches.delete(key);
        })
      );
    }).then(function(){ return self.clients.claim(); })
  );
});

/* Stratégie :
   - Navigation (chargement de page) : réseau d'abord, cache si hors ligne.
   - Ressources statiques du site (images, css, js, pdf) : cache d'abord, réseau en secours.
   - Polices Google Fonts : cache d'abord (changent rarement). */
self.addEventListener('fetch', function(event){
  var request = event.request;
  if(request.method !== 'GET') return;

  var url = new URL(request.url);

  /* Pages HTML : réseau d'abord pour avoir la dernière version en ligne,
     repli sur le cache (donc sur index.html) si pas de connexion. */
  if(request.mode === 'navigate'){
    event.respondWith(
      fetch(request).then(function(response){
        var copy = response.clone();
        caches.open(STATIC_CACHE).then(function(cache){ cache.put('./index.html', copy); });
        return response;
      }).catch(function(){
        return caches.match('./index.html');
      })
    );
    return;
  }

  /* Polices Google Fonts (autre domaine) */
  if(url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com'){
    event.respondWith(
      caches.open(RUNTIME_CACHE).then(function(cache){
        return cache.match(request).then(function(cached){
          if(cached) return cached;
          return fetch(request).then(function(response){
            cache.put(request, response.clone());
            return response;
          });
        });
      })
    );
    return;
  }

  /* Fichiers du site (images, pdf, manifest, etc.) : cache d'abord */
  if(url.origin === self.location.origin){
    event.respondWith(
      caches.match(request).then(function(cached){
        if(cached) return cached;
        return fetch(request).then(function(response){
          if(response && response.status === 200){
            var copy = response.clone();
            caches.open(STATIC_CACHE).then(function(cache){ cache.put(request, copy); });
          }
          return response;
        }).catch(function(){
          /* pas de version en cache et pas de réseau */
        });
      })
    );
  }
});
