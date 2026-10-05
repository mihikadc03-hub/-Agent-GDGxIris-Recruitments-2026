import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'providers/music_provider.dart';
import 'models/song.dart';

void main() {
  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => MusicProvider()),
      ],
      child: const SyncPlayApp(),
    ),
  );
}

class SyncPlayApp extends StatelessWidget {
  const SyncPlayApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'SyncPlay',
      theme: ThemeData.dark().copyWith(
        primaryColor: Colors.deepPurple,
        colorScheme: const ColorScheme.dark(
          primary: Colors.deepPurpleAccent,
          secondary: Colors.tealAccent,
        ),
      ),
      home: const HomeScreen(),
    );
  }
}

class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<MusicProvider>();
    
    return Scaffold(
      appBar: AppBar(
        title: const Text('SyncPlay'),
        actions: [
          IconButton(
            icon: const Icon(Icons.favorite),
            onPressed: () {
              Navigator.push(context, MaterialPageRoute(builder: (_) => const FavouritesScreen()));
            },
          ),
          IconButton(
            icon: const Icon(Icons.group),
            onPressed: () {
              Navigator.push(context, MaterialPageRoute(builder: (_) => const RoomScreen()));
            },
          )
        ],
      ),
      body: Column(
        children: [
          if (provider.roomId != null)
            Container(
              color: Colors.teal.shade900,
              padding: const EdgeInsets.all(8),
              width: double.infinity,
              child: Text(
                'In Room: ${provider.roomId}',
                textAlign: TextAlign.center,
                style: const TextStyle(fontWeight: FontWeight.bold),
              ),
            ),
          Expanded(
            child: ListView.builder(
              itemCount: provider.songs.length,
              itemBuilder: (context, index) {
                final song = provider.songs[index];
                final isFav = provider.isFavourite(song.id);
                return ListTile(
                  leading: Image.network(song.coverUrl, width: 50, height: 50, fit: BoxFit.cover),
                  title: Text(song.title),
                  subtitle: Text(song.artist),
                  trailing: IconButton(
                    icon: Icon(isFav ? Icons.favorite : Icons.favorite_border, color: isFav ? Colors.red : null),
                    onPressed: () => provider.toggleFavourite(song.id),
                  ),
                  onTap: () {
                    provider.playSong(index);
                    Navigator.push(context, MaterialPageRoute(builder: (_) => const PlayerScreen()));
                  },
                );
              },
            ),
          ),
        ],
      ),
      bottomNavigationBar: provider.currentSong != null ? const MiniPlayer() : null,
    );
  }
}

class MiniPlayer extends StatelessWidget {
  const MiniPlayer({super.key});

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<MusicProvider>();
    final song = provider.currentSong!;
    
    return GestureDetector(
      onTap: () {
        Navigator.push(context, MaterialPageRoute(builder: (_) => const PlayerScreen()));
      },
      child: Container(
        height: 70,
        color: Colors.grey.shade900,
        child: Row(
          children: [
            Image.network(song.coverUrl, width: 70, height: 70, fit: BoxFit.cover),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(song.title, style: const TextStyle(fontWeight: FontWeight.bold)),
                  Text(song.artist, style: const TextStyle(fontSize: 12, color: Colors.grey)),
                ],
              ),
            ),
            IconButton(
              icon: Icon(provider.isPlaying ? Icons.pause : Icons.play_arrow),
              onPressed: () {
                if (provider.isPlaying) {
                  provider.pauseSong();
                } else {
                  provider.playSong(provider.currentSongIndex!);
                }
              },
            ),
            const SizedBox(width: 10),
          ],
        ),
      ),
    );
  }
}

class FavouritesScreen extends StatelessWidget {
  const FavouritesScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<MusicProvider>();
    final favSongs = provider.songs.where((s) => provider.isFavourite(s.id)).toList();

    return Scaffold(
      appBar: AppBar(title: const Text('Favourites')),
      body: favSongs.isEmpty
          ? const Center(child: Text('No favourites yet.'))
          : ListView.builder(
              itemCount: favSongs.length,
              itemBuilder: (context, index) {
                final song = favSongs[index];
                return ListTile(
                  leading: Image.network(song.coverUrl, width: 50, height: 50, fit: BoxFit.cover),
                  title: Text(song.title),
                  subtitle: Text(song.artist),
                  trailing: IconButton(
                    icon: const Icon(Icons.favorite, color: Colors.red),
                    onPressed: () => provider.toggleFavourite(song.id),
                  ),
                  onTap: () {
                    final realIndex = provider.songs.indexOf(song);
                    provider.playSong(realIndex);
                    Navigator.push(context, MaterialPageRoute(builder: (_) => const PlayerScreen()));
                  },
                );
              },
            ),
    );
  }
}

class RoomScreen extends StatefulWidget {
  const RoomScreen({super.key});

  @override
  State<RoomScreen> createState() => _RoomScreenState();
}

class _RoomScreenState extends State<RoomScreen> {
  final TextEditingController _ctrl = TextEditingController();

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<MusicProvider>();
    return Scaffold(
      appBar: AppBar(title: const Text('Listening Room')),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: provider.roomId != null
            ? Column(
                mainAxisAlignment: MainAxisAlignment.center,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const Text('Currently in Room:', textAlign: TextAlign.center, style: TextStyle(fontSize: 18)),
                  const SizedBox(height: 10),
                  Text(provider.roomId!, textAlign: TextAlign.center, style: const TextStyle(fontSize: 32, fontWeight: FontWeight.bold, color: Colors.tealAccent)),
                  const SizedBox(height: 40),
                  ElevatedButton(
                    style: ElevatedButton.styleFrom(backgroundColor: Colors.redAccent, foregroundColor: Colors.white),
                    onPressed: () {
                      provider.leaveRoom();
                    },
                    child: const Text('Leave Room'),
                  )
                ],
              )
            : Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  TextField(
                    controller: _ctrl,
                    decoration: const InputDecoration(
                      labelText: 'Room Code',
                      border: const OutlineInputBorder(),
                    ),
                  ),
                  const SizedBox(height: 20),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                    children: [
                      ElevatedButton(
                        onPressed: () {
                          if (_ctrl.text.isNotEmpty) provider.joinRoom(_ctrl.text);
                        },
                        child: const Text('Join Room'),
                      ),
                      ElevatedButton(
                        onPressed: () {
                          final code = DateTime.now().millisecondsSinceEpoch.toString().substring(7);
                          provider.createRoom(code);
                        },
                        child: const Text('Create Room'),
                      )
                    ],
                  )
                ],
              ),
      ),
    );
  }
}

class PlayerScreen extends StatelessWidget {
  const PlayerScreen({super.key});

  String _formatDuration(Duration d) {
    String twoDigits(int n) => n.toString().padLeft(2, '0');
    final minutes = twoDigits(d.inMinutes.remainder(60));
    final seconds = twoDigits(d.inSeconds.remainder(60));
    return '$minutes:$seconds';
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<MusicProvider>();
    final song = provider.currentSong;

    if (song == null) return const Scaffold(body: Center(child: Text('No song playing')));

    return Scaffold(
      appBar: AppBar(title: const Text('Now Playing')),
      body: Padding(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            ClipRRect(
              borderRadius: BorderRadius.circular(20),
              child: Image.network(song.coverUrl, width: 300, height: 300, fit: BoxFit.cover),
            ),
            const SizedBox(height: 40),
            Text(song.title, style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            Text(song.artist, style: const TextStyle(fontSize: 18, color: Colors.grey)),
            const SizedBox(height: 40),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(_formatDuration(provider.position)),
                Text(_formatDuration(provider.duration)),
              ],
            ),
            Slider(
              value: provider.position.inMilliseconds.toDouble(),
              max: provider.duration.inMilliseconds > 0 ? provider.duration.inMilliseconds.toDouble() : 1.0,
              onChanged: (val) {
                provider.seekTo(Duration(milliseconds: val.toInt()));
              },
            ),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                IconButton(
                  iconSize: 64,
                  icon: Icon(provider.isPlaying ? Icons.pause_circle_filled : Icons.play_circle_fill),
                  onPressed: () {
                    if (provider.isPlaying) {
                      provider.pauseSong();
                    } else {
                      provider.playSong(provider.currentSongIndex!);
                    }
                  },
                ),
              ],
            )
          ],
        ),
      ),
    );
  }
}
