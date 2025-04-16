import pygame
import os

class SoundManager:
    def __init__(self):
        # Initialize pygame mixer
        pygame.mixer.init()
        
        # Sound volume settings
        self.sound_volume = 0.7
        self.music_volume = 0.3
        self.sound_enabled = True
        self.music_enabled = True
        
        # Sound dictionary
        self.sounds = {}
        
        # Load sounds
        self.load_sounds()
        
        # Current background music
        self.current_music = None
    
    def load_sounds(self):
        """Load all game sounds - just define the sound structure first without actual files"""
        sound_list = {
            "shoot": "laser_shoot.wav",
            "explosion": "explosion.wav",
            "powerup": "powerup.wav",
            "level_complete": "level_complete.wav",
            "game_over": "game_over.wav",
            "alien_hit": "alien_hit.wav",
            "shield_hit": "shield_hit.wav",
            "extra_life": "extra_life.wav"
        }
        
        # Create the assets/sounds directory if it doesn't exist
        sounds_dir = os.path.join("assets", "sounds")
        if not os.path.exists(sounds_dir):
            os.makedirs(sounds_dir)
        
        # Initialize sound placeholders
        for sound_name in sound_list:
            self.sounds[sound_name] = None
            
        # Note: Actual sound files would be loaded here
        # We'll simulate having sounds by creating dummy Sound objects  
        for sound_name in sound_list:
            # Create a very short silent sound as a placeholder
            placeholder = pygame.mixer.Sound(buffer=bytes([0]*44))
            placeholder.set_volume(0)  # Silent
            self.sounds[sound_name] = placeholder
    
    def play_sound(self, sound_name):
        """Play a sound effect if sound is enabled"""
        if self.sound_enabled and sound_name in self.sounds and self.sounds[sound_name]:
            self.sounds[sound_name].set_volume(self.sound_volume)
            self.sounds[sound_name].play()
    
    def play_music(self, music_name):
        """Play background music if music is enabled"""
        if not self.music_enabled:
            pygame.mixer.music.stop()
            self.current_music = None
            return
            
        # Skip if music is already playing
        if self.current_music == music_name:
            return
        
        music_file = os.path.join("assets", "sounds", music_name)
        
        # For this implementation, we'll use placeholder logic since we don't have actual files
        pygame.mixer.music.stop()
        self.current_music = music_name
        
        # Note: In a real implementation, we would load and play the music file:
        # pygame.mixer.music.load(music_file)
        # pygame.mixer.music.set_volume(self.music_volume)
        # pygame.mixer.music.play(-1)  # -1 means loop indefinitely
    
    def stop_music(self):
        """Stop the currently playing music"""
        pygame.mixer.music.stop()
        self.current_music = None
    
    def toggle_sound(self):
        """Toggle sound effects on/off"""
        self.sound_enabled = not self.sound_enabled
        return self.sound_enabled
    
    def toggle_music(self):
        """Toggle background music on/off"""
        self.music_enabled = not self.music_enabled
        
        # Stop music if it's disabled
        if not self.music_enabled and self.current_music:
            pygame.mixer.music.stop()
        # Resume music if it's enabled
        elif self.music_enabled and self.current_music:
            self.play_music(self.current_music)
            
        return self.music_enabled
    
    def set_sound_volume(self, volume):
        """Set sound effects volume (0.0 to 1.0)"""
        self.sound_volume = max(0.0, min(1.0, volume))
        
    def set_music_volume(self, volume):
        """Set background music volume (0.0 to 1.0)"""
        self.music_volume = max(0.0, min(1.0, volume))
        if self.current_music:
            pygame.mixer.music.set_volume(self.music_volume)