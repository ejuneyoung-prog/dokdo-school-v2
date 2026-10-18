/* Count navigation choices with fixed labels only; never read form values, text or URLs. */
(function(){
'use strict';
const fixed={
 'v3-enter-learn':['learn','main'],'v3-enter-play':['play','main'],'v3-learn-nav':['learn','nav'],
 'v3-explore':['info','menu'],'v3-open-channel':['channel','menu'],'v3-live-entry':['live','main'],
 'v3-info-live':['live','info'],'header-live-link':['live','channel'],'youtube-live-link':['live','channel'],
 'header-channel-link':['channel','channel'],'youtube-channel-link':['channel','channel'],
 'v3-play-link':['play','learning'],'v3-island-link':['play','learning'],'account-link':['account','menu'],
 'game-account-link':['account','playground'],'v3-weather-link':['weather','info']
};
document.addEventListener('click',e=>{
 const el=e.target?.closest?.('a,button');if(!el||el.disabled)return;
 let choice=fixed[el.id];
 if(!choice&&el.matches?.('#channel-latest-list a.v3-video'))choice=['video','channel'];
 if(!choice&&el.classList.contains('v3-result-play'))choice=['play','result'];
 if(!choice&&el.matches?.('.v3-nav a[href="./games.html"]'))choice=['play','nav'];
 if(choice)window.DokdoAnalytics?.track('navigation_click',{destination:choice[0],placement:choice[1]});
},true);
})();
