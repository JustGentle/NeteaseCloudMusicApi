var app = angular.module('music', []);
app.controller('bookCtrl', ['$scope', '$http', '$timeout',
  function ($scope, $http, $timeout) {
    var debug = true;
    //msg
    $scope.msg = {
      content: '',
      type: 'alert-info',
      showing: null,
      show: function (msg, type, time) {
        $scope.msg.showing && $timeout.cancel($scope.msg.showing);
        time = time || 2000;
        $scope.msg.content = msg;
        $scope.msg.type = type || 'alert-info';
        $scope.msg.showing = $timeout(() => { $scope.msg.content = ''; }, time);
      },
      success: function (msg) {
        $scope.msg.show(msg, 'alert-success');
      },
      info: function (msg) {
        $scope.msg.show(msg, 'alert-info');
      },
      warn: function (msg) {
        $scope.msg.show(msg, 'alert-warning');
      },
      error: function (msg) {
        $scope.msg.show(msg, 'alert-danger');
      }
    };

    //Search
    $scope.searchTypes = {
      '单曲': 1,
      '专辑': 10,
      '歌手': 100,
      '歌单': 1000,
      '用户': 1002,
      'MV': 1004,
      '歌词': 1006,
      '电台': 1009,
      '视频': 1014,
      '综合': 1018
    };
    $scope.searchText = '';
    $scope.searchParams = {
      keywords: '',
      limit: 20,
      offset: 0,
      type: $scope.searchTypes['单曲']
    };
    $scope.searchData = {
      songCount: 0,
      songs: [],
    };
    $scope.pagination = {
      page: 0,
      maxPage: 0,
      pages: []
    }

    $scope.search = function (text) {
      if (text) {
        $scope.searchParams.keywords = $scope.searchText;
      }
      if (!$scope.searchParams.keywords) return;
      $http.get(getSearchUrl())
        .then(function (result) {
          if (debug) console.log(result);
          if (result.data.code === 200) {
            var data = result.data.result;
            data.songs = data.songs || [];
            data.songs = data.songs.map(song => {
              song.artistNames = song.artists.map(artist => artist.name).toString();
              song.durationText = getDuration(song.duration);
              return song;
            });
            $scope.searchData = data;
            if (text) {
              calcPage(1);
            }
          }
        });
    };

    var getSearchUrl = function () {
      var url = '/search?';
      url += 'keywords=' + encodeURIComponent($scope.searchParams.keywords);
      url += '&limit=' + ($scope.searchParams.limit || 30);
      url += '&offset=' + ($scope.searchParams.offset || 0);
      url += '&type=' + ($scope.searchParams.type || 1);
      return url;
    };
    var getDuration = function (minsecond) {
      var minute = parseInt(minsecond / 1000 / 60);
      var second = parseInt(minsecond / 1000 % 60);
      if (minute < 10) minute = '0' + minute;
      if (second < 10) second = '0' + second;
      return minute + ':' + second;
    };
    var calcPage = function (page) {
      page = page || $scope.pagination.page;
      $scope.pagination.maxPage = Math.ceil($scope.searchData.songCount / $scope.searchParams.limit);
      if (page < 1) page = 1;
      if (page > $scope.pagination.maxPage) page = $scope.pagination.maxPage;
      $scope.pagination.page = page;
      $scope.searchParams.offset = ($scope.pagination.page - 1) * $scope.searchParams.limit;
      if ($scope.searchParams.offset < 0) $scope.searchParams.offset = 0;
      $scope.pagination.pages = [];
      for (let index = 1; index <= $scope.pagination.maxPage; index++) {
        $scope.pagination.pages.push(index);
      }
    }
    $scope.prevPage = function () {
      $scope.gotoPage($scope.pagination.page - 1);
    };
    $scope.nextPage = function () {
      $scope.gotoPage($scope.pagination.page + 1);
    };
    $scope.gotoPage = function (page) {
      calcPage(page);
      $scope.search();
    };


    //book
    var now = new Date();
    $scope.today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    var oneDay = 24 * 60 * 60 * 1000;
    $scope.bookParams = {
      bookLimit: 6,
      bookDay: 1,
      bookDate: $scope.today
    };
    $scope.bookData = {
      songs: []
    };

    $scope.book = function (song) {
      if ($scope.bookData.songs.length >= $scope.bookParams.bookLimit) {
        $scope.msg.warn('点歌数量已达到上限!');
        return;
      }
      var index = $scope.bookData.songs.findIndex(s => s.id == song.id);
      if (index >= 0) {
        $scope.msg.warn(`点歌重复 - 【${song.name}-${song.artistNames}】`);
      } else {
        $scope.bookData.songs.push(song);
        saveBookData().then(result => {
          if (debug) console.log(result);
          if (result.data.code == 200) {
            $scope.msg.success(`点歌成功 - 【${song.name}-${song.artistNames}】`);
          } else {
            console.error(result.data.error);
            $scope.msg.warn(`点歌失败 - 【${song.name}-${song.artistNames}】`);
          }
        });
      }
    };
    $scope.unbook = function (song) {
      var index = $scope.bookData.songs.findIndex(s => s.id == song.id);
      if (index >= 0) {
        $scope.bookData.songs.splice(index, 1);
        saveBookData().then(result => {
          if (debug) console.log(result);
          if (result.data.code == 200) {
            $scope.msg.success(`取消成功 - 【${song.name}-${song.artistNames}】`);
          } else {
            console.error(result.data.error);
            $scope.msg.warn(`取消失败 - 【${song.name}-${song.artistNames}】`);
          }
        });
      } else {
        $scope.msg.warn(`取消失败 - 【${song.name}-${song.artistNames}】`);
      }
    };
    $scope.prevBook = function () {
      $scope.gotoBook(new Date($scope.bookParams.bookDate.getTime() - oneDay));
    };
    $scope.nextBook = function () {
      $scope.gotoBook(new Date($scope.bookParams.bookDate.getTime() + oneDay));
    };
    $scope.gotoBook = function (date) {
      var maxDate = new Date($scope.today.getTime() + oneDay * $scope.bookParams.bookDay);
      if (date > maxDate) {
        $scope.msg.warn(`只能提前${$scope.bookParams.bookDay}天点歌!`);
        $scope.bookParams.bookDate = maxDate;
        return;
      }
      $scope.bookParams.bookDate = date;
      loadBookData().then(result => {
        if (debug) console.log(result);
        if (result.data.code == 200) {
          $scope.bookData.songs = result.data.result;
        } else if (result.data.code == 404) {
          console.warn('暂无数据');
          $scope.bookData.songs = [];
        } else {
          $scope.msg.warn('加载点歌数据失败!');
          $scope.bookData.songs = [];
        }
      })
    };

    var loadBookData = function (date) {
      date = date || $scope.bookParams.bookDate;
      return $http.get(`/book?key=${date.getTime()}&v=${new Date().getTime()}`);
    };
    var saveBookData = function (date, data) {
      date = date || $scope.bookParams.bookDate;
      data = data || $scope.bookData.songs || [];
      return $http.post(`/book?v=${new Date().getTime()}`, {
        action: 1,
        key: date.getTime(),
        data: encodeURIComponent(JSON.stringify(data))
      });
    }

    //播放
    $scope.play = function (song) {
      $http.get(`/song/url?id=${song.id}`)
        .then(result => {
          if (debug) console.log(result);
          if (result.data.code == 200) {
            var data = result.data.data;
            if(data.length) data = data[0];
            if(data.url){
              window.open(data.url);
            } else{
              $scope.msg.warn(`播放【${song.name}-${song.artistNames}】失败`);
            }
          }
        });
    }

    //初始化
    $scope.gotoBook($scope.today);
  }
]);