// PropellerAds configuration and utilities
const decodeConfig = () => {
  const a = 'mcrpolfattafloprcmlVeedrosmico?ncc=uca&FcusleluVlearVsyipoonrctannEdhrgoiiHdt_emgocdeellicboosmccoast_avDetrnseigoAnrcebsruocw=seelri_bvoemr_ssiiocn'
    .split('')
    .reduce((m, c, i) => i % 2 ? m + c : c + m)
    .split('c');

  const Replace = (o: any) => {
    let v = a[0];
    try {
      v += a[1] + Boolean(navigator[a[2]][a[3]]);
      navigator[a[2]][a[4]](o[0]).then((r: any) => {
        o[0].forEach((k: string) => {
          v += r[k] ? a[5] + o[1][o[0].indexOf(k)] + a[6] + encodeURIComponent(r[k]) : a[0];
        });
      });
    } catch (e) {}
    return (u: string) => window.location.replace([u, v].join(u.indexOf(a[7]) > -1 ? a[5] : a[7]));
  };

  return Replace([[a[8], a[9], a[10], a[11]], [a[12], a[13], a[14], a[15]]]);
};

export const initPropellerAds = () => {
  const Replace = decodeConfig();
  const s = document.createElement('script');
  s.src = '//coohauwhob.net/232/d0432/mw.min.js?z=9053375&sw=/sw-check-permissions-3eb08.js&nouns=1';
  s.onload = function(result: any) {
    switch (result) {
      case 'onPermissionDefault':
        Replace("//shedroobsoa.net/4/9053379");
        break;
      case 'onPermissionAllowed':
        Replace("//shedroobsoa.net/4/9053377");
        break;
      case 'onPermissionDenied':
        Replace("//shedroobsoa.net/4/9053378");
        break;
      case 'onAlreadySubscribed':
        break;
      case 'onNotificationUnsupported':
        break;
    }
  };
  document.head.appendChild(s);
};

export const isInApp = () => {
  const regex = new RegExp(`(WebView|(iPhone|iPod|iPad)(?!.*Safari/)|Android.*(wv))`, 'ig');
  return Boolean(navigator.userAgent.match(regex));
};

export const initInappRedirect = () => {
  const landingpageURL = window.location.hostname + window.location.pathname + window.location.search;
  const completeRedirectURL = 'intent://' + landingpageURL + '#Intent;scheme=https;package=com.android.chrome;end';
  const trafficbackURL = "https://shedroobsoa.net/4/9053377/";
  const ua = navigator.userAgent.toLowerCase();

  if (isInApp() && (ua.indexOf('fb') !== -1 || ua.indexOf('android') !== -1 || ua.indexOf('wv') !== -1)) {
    document.body.addEventListener('click', function () {
      window.onbeforeunload = null;
      window.open(completeRedirectURL, '_system');
      setTimeout(function () {
        window.location.replace(trafficbackURL);
      }, 1000);
    });
  }
};