(function () {
  var ROUTES = ['landing', 'dashboard', 'saved', 'digest', 'settings', 'proof'];
  var DEFAULT_ROUTE = 'landing';

  function getRoute() {
    var hash = window.location.hash.slice(1).toLowerCase();
    if (!hash || hash === '') return DEFAULT_ROUTE;
    if (hash === 'jt/07-test' || hash === 'jt/08-ship' || hash === 'jt/proof') {
      return 'proof';
    }
    return ROUTES.indexOf(hash) >= 0 ? hash : DEFAULT_ROUTE;
  }

  function setRoute(route) {
    window.location.hash = route;
  }

  function showPage(route) {
    var pages = document.querySelectorAll('.kn-page');
    var links = document.querySelectorAll('.kn-app-nav__link');
    pages.forEach(function (p) {
      p.classList.toggle('is-active', p.getAttribute('data-route') === route);
    });
    links.forEach(function (a) {
      var linkRoute = a.getAttribute('data-route');
      a.classList.toggle('kn-app-nav__link--active', linkRoute === route);
    });
  }

  function syncFromHash() {
    var route = getRoute();
    showPage(route);
  }

  function initHamburger() {
    var btn = document.getElementById('hamburger');
    var list = document.getElementById('nav-list');
    if (!btn || !list) return;
    btn.addEventListener('click', function () {
      var open = list.classList.toggle('is-open');
      btn.setAttribute('aria-expanded', open);
      btn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    });
    document.querySelectorAll('.kn-app-nav__link').forEach(function (link) {
      link.addEventListener('click', function () {
        list.classList.remove('is-open');
        btn.setAttribute('aria-expanded', 'false');
        btn.setAttribute('aria-label', 'Open menu');
      });
    });
  }

  function initCtaAndLinks() {
    document.querySelectorAll('a[href^="#"]').forEach(function (a) {
      var route = a.getAttribute('data-route') || a.getAttribute('href').slice(1);
      if (route) {
        a.addEventListener('click', function (e) {
          e.preventDefault();
          setRoute(route);
        });
      }
    });
  }

  window.addEventListener('hashchange', syncFromHash);
  syncFromHash();
  initHamburger();
  initCtaAndLinks();
})();
