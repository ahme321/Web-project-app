class MusicPlayer {
    constructor() {
        console.log('MusicPlayer constructor called');
        this.audio = new Audio();
        this.tracks = [];
        this.currentTrackIndex = parseInt(localStorage.getItem('currentTrackIndex')) || 0;
        this.isPlaying = JSON.parse(localStorage.getItem('isPlaying')) || false;
        this.volume = parseFloat(localStorage.getItem('volume')) || 1;
        this.audio.volume = this.volume;
        
        this.initializeElements();
        this.addEventListeners();
        
        // Load tracks and restore state
        this.loadTracks().then(() => {
            console.log(`Loaded ${this.tracks.length} tracks`);
            const savedTime = parseFloat(localStorage.getItem('currentTime')) || 0;
            const savedTrack = localStorage.getItem('currentTrack');
            
            if (this.tracks.length > 0) {
                // If we have a saved track and it exists in our tracks list
                if (savedTrack) {
                    const trackIndex = this.tracks.findIndex(t => t.filename === savedTrack);
                    if (trackIndex !== -1) {
                        this.currentTrackIndex = trackIndex;
                    }
                }
                
                this.loadTrack(this.currentTrackIndex, false);
                this.audio.currentTime = savedTime;
                
                if (this.isPlaying) {
                    this.audio.play().catch(error => {
                        console.error('Error playing audio:', error);
                        this.isPlaying = false;
                    });
                    this.updatePlayButton(true);
                }
            } else {
                console.log('No tracks found or tracks array is empty');
            }
        }).catch(error => {
            console.error('Error in loadTracks promise:', error);
        });
        
        this.updateActiveSong(this.currentTrackIndex);
    }

    initializeElements() {
        this.playPauseBtn = document.querySelector('.play-pause');
        this.nextBtn = document.querySelector('.next');
        this.prevBtn = document.querySelector('.previous');
        this.volumeBtn = document.querySelector('.volume-button');
        this.volumeSlider = document.querySelector('.volume-slider');
        this.volumeProgress = document.querySelector('.volume-progress');
        this.progressBar = document.querySelector('.progress-bar');
        this.progress = document.querySelector('.progress');
        this.currentTimeSpan = document.querySelector('.current-time');
        this.totalTimeSpan = document.querySelector('.total-time');
        this.songTitle = document.querySelector('.song-details h4');
        this.songArtist = document.querySelector('.song-details p');
        this.songImage = document.querySelector('.current-song-image');
    }

    addEventListeners() {
        // Player controls
        this.playPauseBtn.addEventListener('click', () => this.togglePlayPause());
        this.nextBtn.addEventListener('click', () => this.playNext());
        this.prevBtn.addEventListener('click', () => this.playPrevious());
        
        // Volume controls
        this.volumeSlider.addEventListener('click', (e) => this.handleVolumeChange(e));
        this.volumeBtn.addEventListener('click', () => this.toggleMute());
        
        // Progress bar
        this.progressBar.addEventListener('click', (e) => this.handleProgressBarClick(e));
        
        // Audio events
        this.audio.addEventListener('timeupdate', () => {
            this.updateProgress();
            localStorage.setItem('currentTime', this.audio.currentTime);
        });
        
        this.audio.addEventListener('ended', () => this.playNext());

        // Save state before page unload
        window.addEventListener('beforeunload', () => this.saveState());
    }

    async loadTracks() {
        try {
            console.log('Fetching tracks from API...');
            const apiUrl = 'http://localhost:3001/api/tracks';
            console.log('API URL:', apiUrl);
            
            const response = await fetch(apiUrl);
            if (!response.ok) {
                throw new Error(`API returned status ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            console.log(`Received ${data.length} tracks from API`);
            
            // Ensure duration values are numbers
            this.tracks = data.map(track => {
                // If duration exists but is a string, convert to number
                if (track.duration && typeof track.duration === 'string') {
                    track.duration = parseFloat(track.duration);
                }
                
                // If duration is invalid or doesn't exist, use file metadata when available
                if (!track.duration || isNaN(track.duration) || track.duration <= 0) {
                    // Will be set when audio loads
                    track.duration = 0;
                }
                
                return track;
            });
            
            return this.tracks;
        } catch (error) {
            console.error('Error loading tracks:', error);
            // Fallback to some sample tracks if API is not available
            this.tracks = [
                {
                    id: '1',
                    title: 'K.',
                    artist: 'Cigarettes After Sex',
                    album: 'K.',
                    cover_url: 'images/image.jpg',
                    filename: 'song1.mp3',
                    duration: 210
                },
                {
                    id: '2',
                    title: 'Nothing\'s Gonna Hurt You Baby',
                    artist: 'Cigarettes After Sex',
                    album: 'I.',
                    cover_url: 'images/image.jpg',
                    filename: 'song2.mp3',
                    duration: 195
                }
            ];
            console.log('Using fallback tracks:', this.tracks);
            return this.tracks;
        }
    }

    async loadTrack(index, shouldPlay = false) {
        if (index >= 0 && index < this.tracks.length) {
            const track = this.tracks[index];
            this.audio.src = `http://localhost:3001/tracks/${encodeURIComponent(track.filename)}`;
            
            // Update track info
            this.songTitle.textContent = track.title;
            this.songArtist.textContent = track.artist;
            this.songImage.src = track.cover_url;
            this.currentTrackIndex = index;
            this.progress.style.width = '0%';
            this.currentTimeSpan.textContent = '0:00';

            // Update active song highlighting
            this.updateActiveSong(index);
            
            // Set up metadata loading
            this.audio.addEventListener('loadedmetadata', () => {
                // Update track duration if it was 0 or invalid
                if (!track.duration || track.duration <= 0) {
                    track.duration = this.audio.duration;
                    console.log(`Updated duration for track ${track.title} to ${track.duration}`);
                    
                    // Update duration display in track list if present
                    const trackRows = document.querySelectorAll('#tracks-container tr');
                    if (trackRows[index]) {
                        const durationCell = trackRows[index].querySelector('.track-duration');
                        if (durationCell) {
                            durationCell.textContent = this.formatTime(track.duration);
                        }
                    }
                }
                
                this.totalTimeSpan.textContent = this.formatTime(this.audio.duration);
            }, { once: true });  // only run once per track load

            if (shouldPlay) {
                await this.audio.play();
                this.isPlaying = true;
                this.updatePlayButton(true);
            }
        }
    }

    updateTrackInfo(track) {
        if (this.songTitle) this.songTitle.textContent = track.title;
        if (this.songArtist) this.songArtist.textContent = track.artist;
        if (this.songImage) this.songImage.src = track.cover_url;
    }

    async togglePlayPause() {
        if (this.audio.paused) {
            await this.audio.play();
            this.isPlaying = true;
        } else {
            this.audio.pause();
            this.isPlaying = false;
        }
        this.updatePlayButton(this.isPlaying);
        localStorage.setItem('isPlaying', this.isPlaying);
    }

    updatePlayButton(isPlaying) {
        if (this.playPauseBtn) {
            this.playPauseBtn.innerHTML = isPlaying ? 
                '<i class="fas fa-pause"></i>' : 
                '<i class="fas fa-play"></i>';
        }
    }

    async playNext() {
        const nextIndex = (this.currentTrackIndex + 1) % this.tracks.length;
        await this.loadTrack(nextIndex);
        if (this.isPlaying) {
            await this.audio.play();
        }
    }

    async playPrevious() {
        const prevIndex = (this.currentTrackIndex - 1 + this.tracks.length) % this.tracks.length;
        await this.loadTrack(prevIndex);
        if (this.isPlaying) {
            await this.audio.play();
        }
    }

    handleVolumeChange(e) {
        const rect = this.volumeSlider.getBoundingClientRect();
        const position = (e.clientX - rect.left) / rect.width;
        this.setVolume(position);
    }

    setVolume(volume) {
        this.audio.volume = Math.max(0, Math.min(1, volume));
        if (this.volumeProgress) {
            this.volumeProgress.style.width = `${this.audio.volume * 100}%`;
        }
        this.updateVolumeIcon();
        localStorage.setItem('volume', this.audio.volume);
    }

    toggleMute() {
        if (this.audio.volume > 0) {
            this.previousVolume = this.audio.volume;
            this.setVolume(0);
        } else {
            this.setVolume(this.previousVolume || 1);
        }
    }

    updateVolumeIcon() {
        if (!this.volumeBtn) return;
        
        if (this.audio.volume === 0) {
            this.volumeBtn.innerHTML = '<i class="fas fa-volume-mute"></i>';
        } else if (this.audio.volume < 0.5) {
            this.volumeBtn.innerHTML = '<i class="fas fa-volume-down"></i>';
        } else {
            this.volumeBtn.innerHTML = '<i class="fas fa-volume-up"></i>';
        }
    }

    handleProgressBarClick(e) {
        const rect = this.progressBar.getBoundingClientRect();
        const position = (e.clientX - rect.left) / rect.width;
        this.audio.currentTime = position * this.audio.duration;
    }

    updateProgress() {
        if (!this.audio.duration) return;
        
        const progress = (this.audio.currentTime / this.audio.duration) * 100;
        if (this.progress) {
            this.progress.style.width = `${progress}%`;
        }
        if (this.currentTimeSpan) {
            this.currentTimeSpan.textContent = this.formatTime(this.audio.currentTime);
        }
    }

    formatTime(seconds) {
        if (!seconds || isNaN(seconds) || seconds < 0) {
            return '0:00';
        }
        
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    updateActiveSong(index) {
        // Remove active class from all song titles
        document.querySelectorAll('.song-title').forEach(title => {
            title.classList.remove('active-song');
        });

        // Add active class to current song
        const songTitles = document.querySelectorAll('.song-title');
        if (songTitles[index]) {
            songTitles[index].classList.add('active-song');
        }
    }

    // Add this method to handle track changes
    handleTrackChange(index) {
        this.updateActiveSong(index);
    }

    saveState() {
        localStorage.setItem('currentTrackIndex', this.currentTrackIndex);
        localStorage.setItem('isPlaying', this.isPlaying);
        localStorage.setItem('volume', this.audio.volume);
        localStorage.setItem('currentTime', this.audio.currentTime);
        if (this.tracks[this.currentTrackIndex]) {
            localStorage.setItem('currentTrack', this.tracks[this.currentTrackIndex].filename);
        }
    }
} 