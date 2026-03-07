(function() {
  if (localStorage.getItem('PataKeja_darkMode') === 'true') {
    document.documentElement.classList.add('dark');
    document.documentElement.style.background = '#111827';
  }
})();
