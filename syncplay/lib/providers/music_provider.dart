import 'package:flutter/material.dart';
import 'package:just_audio/just_audio.dart';
import 'package:socket_io_client/socket_io_client.dart' as IO;
import '../models/song.dart';

class MusicProvider with ChangeNotifier {
  final AudioPlayer _player = AudioPlayer();
  List<Song> songs = [
    Song(
      id: '1',
      title: 'Lofi Study',
      artist: 'FASSounds',
      url: 'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3',
      coverUrl: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=300',
    ),
    Song(
      id: '2',
      title: 'Good Night',
      artist: 'FASSounds',
      url: 'https://cdn.pixabay.com/download/audio/2022/10/25/audio_226b42b662.mp3',
      coverUrl: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=300',
    ),
    Song(
      id: '3',
      title: 'Chill Abstract',
      artist: 'Coma-Media',
      url: 'https://cdn.pixabay.com/download/audio/2022/11/22/audio_d1718ab41b.mp3',
      coverUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=300',
    ),
  ];

  int? _currentSongIndex;
  bool _isPlaying = false;
  Duration _position = Duration.zero;
  Duration _duration = Duration.zero;

  List<String> _favourites = [];

  String? _roomId;
  IO.Socket? _socket;
  bool _isSyncing = false;

  MusicProvider() {
    _player.positionStream.listen((p) {
      _position = p;
      notifyListeners();
    });
    _player.durationStream.listen((d) {
      if (d != null) {
        _duration = d;
        notifyListeners();
      }
    });
    _player.playerStateStream.listen((state) {
      _isPlaying = state.playing;
      notifyListeners();
      _broadcastState();
    });
  }

  int? get currentSongIndex => _currentSongIndex;
  Song? get currentSong => _currentSongIndex != null ? songs[_currentSongIndex!] : null;
  bool get isPlaying => _isPlaying;
  Duration get position => _position;
  Duration get duration => _duration;
  List<String> get favourites => _favourites;
  String? get roomId => _roomId;

  void toggleFavourite(String id) {
    if (_favourites.contains(id)) {
      _favourites.remove(id);
    } else {
      _favourites.add(id);
    }
    notifyListeners();
  }

  bool isFavourite(String id) => _favourites.contains(id);

  Future<void> playSong(int index) async {
    if (_currentSongIndex == index) {
      await _player.play();
    } else {
      _currentSongIndex = index;
      notifyListeners();
      await _player.setUrl(songs[index].url);
      await _player.play();
    }
    _broadcastState();
  }

  Future<void> pauseSong() async {
    await _player.pause();
    _broadcastState();
  }

  Future<void> seekTo(Duration position) async {
    await _player.seek(position);
    _broadcastState();
  }

  void createRoom(String id) {
    _joinRoom(id);
  }

  void joinRoom(String id) {
    _joinRoom(id);
  }

  void leaveRoom() {
    if (_socket != null) {
      _socket!.disconnect();
      _socket = null;
    }
    _roomId = null;
    notifyListeners();
  }

  void _joinRoom(String id) {
    _roomId = id;
    notifyListeners();
    _socket = IO.io('http://localhost:4000', <String, dynamic>{
      'transports': ['websocket'],
      'autoConnect': true,
    });

    _socket!.onConnect((_) {
      print('Connected to socket server');
      _socket!.emit('join_room', {'roomId': _roomId});
    });

    _socket!.on('sync_state', (data) {
      _isSyncing = true;
      _applyRemoteState(data);
    });
  }

  void _applyRemoteState(dynamic data) async {
    if (data['songIndex'] != null) {
      int index = data['songIndex'];
      if (_currentSongIndex != index) {
        _currentSongIndex = index;
        await _player.setUrl(songs[index].url);
      }
    }
    
    if (data['position'] != null) {
      int posMs = data['position'];
      if ((_player.position.inMilliseconds - posMs).abs() > 1000) {
         await _player.seek(Duration(milliseconds: posMs));
      }
    }

    if (data['isPlaying'] != null) {
      bool shouldPlay = data['isPlaying'];
      if (shouldPlay && !_player.playing) {
        await _player.play();
      } else if (!shouldPlay && _player.playing) {
        await _player.pause();
      }
    }
    
    _isSyncing = false;
  }

  void _broadcastState() {
    if (_socket != null && _roomId != null && !_isSyncing) {
      _socket!.emit('sync_state', {
        'roomId': _roomId,
        'state': {
          'songIndex': _currentSongIndex,
          'isPlaying': _isPlaying,
          'position': _player.position.inMilliseconds,
        }
      });
    }
  }

  @override
  void dispose() {
    _player.dispose();
    _socket?.dispose();
    super.dispose();
  }
}
