import pygame
import random
import math
from player import Player
from base_alien import ScoutAlien, ArmoredAlien, EliteAlien
from missile import Missile, AlienMissile
import powerup
from effects import Explosion, ShieldEffect, SlowTimeEffect
from help_screen import HelpScreen

class Game:
    def __init__(self):
        # Set up display
        self.width = 1024
        self.height = 768
        self.screen = pygame.display.set_mode((self.width, self.height))
        pygame.display.set_caption("Space Invaders")
        
        # Set up game objects
        self.player = Player(self.width, self.height)
        self.missiles = []
        self.alien_missiles = []  # Missiles fired by aliens
        
        # Set up aliens
        self.aliens = []
        self.alien_direction = 1
        
        # Game state
        self.score = 0
        self.high_score = 0
        self.game_over = False
        self.game_won = False
        self.level = 1
        self.level_complete = False
        self.max_level = 3  # Total number of levels in the game
        self.show_startup_message = True  # Show instructions at start
        
        # Difficulty settings
        self.difficulty = "normal"  # "easy", "normal", "hard"
        self.difficulty_multipliers = {
            "easy": 0.75,     # Slower aliens, more player health
            "normal": 1.0,   # Base values
            "hard": 1.5      # Faster aliens, less player health
        }
        
        # Visual effects
        self.explosions = []
        self.effects = []  # Other visual effects
        self.power_ups = []
        
        # UI elements
        self.help_screen = HelpScreen(self.width, self.height)
        
        # Level configurations
        self.level_configs = [
            # Level 1 - Red Scouts (1 health)
            {
                "rows": 4,
                "cols": 8,
                "alien_class": ScoutAlien,
                "color": (255, 50, 50),  # Red
                "speed": 0.5 * self.get_difficulty_multiplier(),
                "points": 10,
                "power_up_chance": 0.1,  # 10% chance per alien
                "alien_fire_chance": 0.0005 * self.get_difficulty_multiplier(),
                "vertical_move": 8  # Pixels to move down when hitting edge
            },
            # Level 2 - Blue Armored (2 health)
            {
                "rows": 5,
                "cols": 8,
                "alien_class": ArmoredAlien,
                "color": (50, 100, 255),  # Blue
                "speed": 0.8 * self.get_difficulty_multiplier(),
                "points": 15,
                "power_up_chance": 0.15,
                "alien_fire_chance": 0.001 * self.get_difficulty_multiplier(),
                "vertical_move": 10
            },
            # Level 3 - Green Elite (3 health)
            {
                "rows": 5,
                "cols": 10,
                "alien_class": EliteAlien,
                "color": (50, 255, 50),  # Green
                "speed": 1.2 * self.get_difficulty_multiplier(),
                "points": 20,
                "power_up_chance": 0.2,
                "alien_fire_chance": 0.0015 * self.get_difficulty_multiplier(),
                "vertical_move": 12
            }
        ]
        
        # Create aliens for the current level
        self.create_aliens()
        
        # Font for text
        self.font = pygame.font.SysFont(None, 36)
        self.small_font = pygame.font.SysFont(None, 24)

        # Last fire time for cooldown
        self.last_fire_time = 0  # For missile firing cooldown
    
    def get_difficulty_multiplier(self):
        """Get the current difficulty multiplier"""
        return self.difficulty_multipliers.get(self.difficulty, 1.0)
    
    def set_difficulty(self, difficulty):
        """Set game difficulty level"""
        if difficulty in self.difficulty_multipliers:
            self.difficulty = difficulty
            # Update alien speeds based on new difficulty
            for alien in self.aliens:
                config = self.level_configs[self.level - 1]
                alien.speed = config["speed"] * self.get_difficulty_multiplier()
    
    def create_aliens(self):
        # Clear existing aliens if any
        self.aliens = []
        
        # Get the configuration for the current level (0-indexed array)
        config = self.level_configs[self.level - 1]
        
        # Create a grid of aliens based on level configuration
        rows = config["rows"]
        cols = config["cols"]
        alien_color = config["color"]
        alien_speed = config["speed"]
        alien_class = config["alien_class"]
        
        # Calculate spacing and starting positions based on resolution
        horizontal_spacing = 80  # Space between aliens horizontally
        vertical_spacing = 70   # Increased vertical spacing
        
        # Centering the grid of aliens
        start_x = (self.width - (cols * horizontal_spacing)) // 2 + horizontal_spacing // 2
        start_y = 50  # Start higher on the screen
        
        for row in range(rows):
            for col in range(cols):
                x = start_x + col * horizontal_spacing
                y = start_y + row * vertical_spacing
                self.aliens.append(alien_class(x, y, color=alien_color))
    
    def fire_missile(self):
        if not self.game_over and not self.game_won:
            missile = self.player.fire_missile()
            if missile is not None:
                if isinstance(missile, list):
                    # List of missiles case
                    for single_missile in missile:
                        self.missiles.append(single_missile)
                else:
                    # Single missile case
                    self.missiles.append(missile)

    def handle_movement(self):
        # Skip movement when help screen is active or showing startup message
        if self.help_screen.active or self.show_startup_message:
            # Check for space key to start the game from startup message
            keys = pygame.key.get_pressed()
            if self.show_startup_message and keys[pygame.K_SPACE]:
                self.show_startup_message = False
            return
            
        if not self.game_over and not self.game_won:
            # Get pressed keys
            keys = pygame.key.get_pressed()
            
            # Default to stopping (will be overridden if moving)
            self.player.stop_moving()
            
            # Apply movement based on currently pressed keys
            if keys[pygame.K_LEFT] and not keys[pygame.K_RIGHT]:
                self.player.move_left()
            elif keys[pygame.K_RIGHT] and not keys[pygame.K_LEFT]:
                self.player.move_right()
                
                
            # Fire if space is pressed
            if keys[pygame.K_SPACE]:
                # Only fire if we don't have too many missiles already (to prevent spam)
                if len(self.missiles) < 15:  # Limit to 15 missiles at once
                    new_missile = self.player.fire_missile()
                    # Only add if we didn't just fire (add some cooldown)
                    if not self.missiles or pygame.time.get_ticks() - self.last_fire_time > 250:  # 250ms cooldown
                        if new_missile is not None:  # Check that we got a valid missile back
                            if isinstance(new_missile, list):
                                # List of missiles case
                                for single_missile in new_missile:
                                    self.missiles.append(single_missile)
                            else:
                                # Single missile case
                                self.missiles.append(new_missile)
                            self.last_fire_time = pygame.time.get_ticks()

        # Handle continuous key presses
        keys = pygame.key.get_pressed()
        if keys[pygame.K_LEFT]:
            self.player.move_left()
        if keys[pygame.K_RIGHT]:
            self.player.move_right()
        
        # Restart game with R key
        if (self.game_over or self.game_won) and keys[pygame.K_r]:
            self.__init__()  # Reset the game
    
    def update(self):
        # Skip game updates when help screen is active or showing startup message
        if self.help_screen.active or self.show_startup_message:
            return
            
        if self.game_over or self.game_won:
            return

        # Update the player state
        self.player.update()
            
        # If level is complete, advance to next level
        if self.level_complete:
            if self.level < self.max_level:
                # Advance to next level
                self.level += 1
                self.level_complete = False
                
                # Clear missiles and other objects for the new level
                self.missiles = []
                self.alien_missiles = []
                self.power_ups = []
                self.explosions = []
                self.effects = []
                
                # Reset player position and upgrade the ship
                self.player.x = self.width // 2
                self.player.velocity = 0
                self.player.level_up()  # Upgrade player's ship for the new level
                
                # Create new aliens for the next level
                self.create_aliens()
                
                # Show a message
                print(f"Starting level {self.level}")
                # For debugging
                config = self.level_configs[self.level - 1]
                print(f"Alien class: {config['alien_class'].__name__}")
                print(f"Color: {config['color']}")
                print(f"Speed: {config['speed']}")
                print(f"Alien config: {config}")
                for alien in self.aliens[:1]:
                    print(f"Alien instance: {alien.__class__.__name__}")
                    print(f"Alien color: {alien.color}")
                    print(f"Alien speed: {alien.speed}")
            else:
                # If completed the final level, player wins the game
                self.game_won = True
            return
        
        # Update missiles
        for missile in self.missiles[:]:
            missile.update(self.width)
            if not missile.active:
                self.missiles.remove(missile)
        
        # Update alien missiles
        for missile in self.alien_missiles[:]:
            missile.update(self.width, self.height)
            if not missile.active:
                self.alien_missiles.remove(missile)
        
        # Check if any aliens need to reverse direction
        move_down = False
        for alien in self.aliens:
            if alien.alive:
                if (alien.x + alien.size // 2 > self.width and self.alien_direction > 0) or \
                   (alien.x - alien.size // 2 < 0 and self.alien_direction < 0):
                    self.alien_direction *= -1
                    move_down = True
                    break
        
        # Update aliens - apply slow time effect if active
        config = self.level_configs[self.level - 1]
        vertical_move = config["vertical_move"]
        
        # Apply slow time factor if the power-up is active
        speed_multiplier = 1.0
        if self.player.has_slow_time:
            speed_multiplier = self.player.slow_time_factor
            
        for alien in self.aliens:
            if alien.alive:
                alien.move(self.alien_direction, speed_multiplier)
                if move_down:
                    alien.move_down(vertical_move)
                
                # Check if alien reached the bottom
                if alien.y + alien.size // 2 > self.player.y - self.player.height // 2:
                    self.game_over = True
                    break
                
                # Chance for alien to fire missile
                if random.random() < config["alien_fire_chance"]:
                    # Fire at the player with some randomness
                    target_x = self.player.x + random.randint(-50, 50)
                    target_y = self.player.y
                    self.alien_missiles.append(AlienMissile(alien.x, alien.y + alien.size//2, target_x, target_y))
        
        # Check for missile-alien collisions
        for missile in self.missiles[:]:
            for alien in self.aliens:
                if alien.alive and alien.check_collision(missile):
                    # Get the damage from the missile (default is 1)
                    damage = getattr(missile, 'damage', 1)
                    
                    # Apply damage and check if alien is destroyed
                    alien_destroyed = alien.take_damage(missile, damage)
                    
                    # Remove the missile
                    missile.active = False
                    if missile in self.missiles:
                        self.missiles.remove(missile)
                    
                    # Create explosion effect
                    self.explosions.append(Explosion(missile.x, missile.y))
                    
                    # Award points if the alien was destroyed
                    if alien_destroyed:
                        # Get points value from level config
                        self.score += config["points"]
                        
                        # Create explosion effect at alien position
                        self.explosions.append(Explosion(alien.x, alien.y, size=40, color=(255, 200, 50)))
                        
                        # Chance to drop a power-up
                        if random.random() < config["power_up_chance"]:
                            self.power_ups.append(powerup.spawn_random_powerup(alien.x, alien.y))
                    else:
                        # Award partial points for a hit that doesn't destroy
                        self.score += 5
                    
                    break
        
        # Check for alien missile-player collisions
        for missile in self.alien_missiles[:]:
            # Check if missile collides with player
            player_rect = pygame.Rect(
                self.player.x - self.player.width // 2,
                self.player.y - self.player.height // 2,
                self.player.width,
                self.player.height
            )
            
            missile_rect = pygame.Rect(
                missile.x - missile.width // 2,
                missile.y - missile.height // 2,
                missile.width,
                missile.height
            )
            
            if player_rect.colliderect(missile_rect):
                # Player is hit
                missile.active = False
                self.alien_missiles.remove(missile)
                
                # Create explosion
                self.explosions.append(Explosion(missile.x, missile.y, color=(255, 100, 100)))
                
                # Player takes damage if not shielded
                if self.player.take_damage():
                    if self.player.lives <= 0:
                        self.game_over = True
        
        # Update power-ups
        for power_up in self.power_ups[:]:
            power_up.update()
            
            # Remove if inactive
            if not power_up.active:
                self.power_ups.remove(power_up)
                continue
            
            # Check for collision with player
            if power_up.check_collision(self.player):
                # Apply power-up effect
                if power_up.type == "shield":
                    self.player.activate_shield()
                    # Add shield visual effect
                    self.effects.append(ShieldEffect(self.player))
                elif power_up.type == "rapid_fire":
                    self.player.activate_rapid_fire()
                elif power_up.type == "multi_shot":
                    self.player.activate_multi_shot()
                elif power_up.type == "extra_life":
                    self.player.add_life()
                elif power_up.type == "slow_time":
                    self.player.activate_slow_time()
                    # Add slow time visual effect
                    self.effects.append(SlowTimeEffect(self.width, self.height))
                
                # Remove the power-up
                self.power_ups.remove(power_up)
        
        # Update explosions and effects
        for explosion in self.explosions[:]:
            explosion.update()
            if not explosion.active:
                self.explosions.remove(explosion)
                
        for effect in self.effects[:]:
            effect.update()
            if not effect.active:
                self.effects.remove(effect)
        
        # Check if all aliens are dead
        if all(not alien.alive for alien in self.aliens):
            self.level_complete = True
            
        # Update high score
        if self.score > self.high_score:
            self.high_score = self.score
    
    def render(self):
        # Clear screen
        self.screen.fill((0, 0, 0))
        
        # Show startup message if needed
        if self.show_startup_message:
            self.render_startup_message()
            pygame.display.flip()
            return
        
        # Draw game objects
        self.player.draw(self.screen)
        
        for missile in self.missiles:
            missile.draw(self.screen)
            
        for missile in self.alien_missiles:
            missile.draw(self.screen)
        
        for alien in self.aliens:
            alien.draw(self.screen)
            
        # Draw power-ups
        for power_up in self.power_ups:
            power_up.draw(self.screen)
            
        # Draw explosions and effects
        for explosion in self.explosions:
            explosion.draw(self.screen)
            
        for effect in self.effects:
            effect.draw(self.screen)
        
        # Display score, high score, and level
        score_text = self.font.render(f"Score: {self.score}", True, (255, 255, 255))
        self.screen.blit(score_text, (10, 10))
        
        high_score_text = self.font.render(f"High Score: {self.high_score}", True, (255, 255, 255))
        high_score_rect = high_score_text.get_rect(centerx=self.width // 2, top=10)
        self.screen.blit(high_score_text, high_score_rect)
        
        level_text = self.font.render(f"Level: {self.level}/{self.max_level}", True, (255, 255, 255))
        self.screen.blit(level_text, (10, 50))
        
        # Display difficulty
        difficulty_text = self.small_font.render(f"Difficulty: {self.difficulty.capitalize()}", True, (200, 200, 200))
        self.screen.blit(difficulty_text, (self.width - difficulty_text.get_width() - 10, 10))
        
        # Display lives
        lives_text = self.font.render(f"Lives: ", True, (255, 255, 255))
        self.screen.blit(lives_text, (10, self.height - 60))
        self.player.draw_lives(self.screen, 100, self.height - 50)
        
        # Display active power-ups
        power_up_y = self.height - 100
        if self.player.has_shield:
            shield_text = self.small_font.render("Shield", True, (100, 200, 255))
            self.screen.blit(shield_text, (self.width - shield_text.get_width() - 10, power_up_y))
            power_up_y -= 25
            
        if self.player.has_rapid_fire:
            rapid_fire_text = self.small_font.render("Rapid Fire", True, (255, 255, 0))
            self.screen.blit(rapid_fire_text, (self.width - rapid_fire_text.get_width() - 10, power_up_y))
            power_up_y -= 25
            
        if self.player.has_multi_shot:
            multi_shot_text = self.small_font.render("Multi-Shot", True, (0, 255, 0))
            self.screen.blit(multi_shot_text, (self.width - multi_shot_text.get_width() - 10, power_up_y))
            power_up_y -= 25
            
        if self.player.has_slow_time:
            slow_time_text = self.small_font.render("Slow Time", True, (150, 100, 255))
            self.screen.blit(slow_time_text, (self.width - slow_time_text.get_width() - 10, power_up_y))
        
        # Display level transition message
        if self.level_complete and self.level < self.max_level:
            level_complete_text = self.font.render(f"LEVEL {self.level} COMPLETE! Advancing to Level {self.level + 1}...", True, (0, 255, 0))
            text_rect = level_complete_text.get_rect(center=(self.width // 2, self.height // 2))
            self.screen.blit(level_complete_text, text_rect)
        
        # Display game over or win message
        if self.game_over:
            game_over_text = self.font.render("GAME OVER - Press R to restart", True, (255, 0, 0))
            text_rect = game_over_text.get_rect(center=(self.width // 2, self.height // 2))
            self.screen.blit(game_over_text, text_rect)
        
        if self.game_won:
            win_text = self.font.render("CONGRATULATIONS! YOU BEAT ALL LEVELS! - Press R to restart", True, (0, 255, 0))
            text_rect = win_text.get_rect(center=(self.width // 2, self.height // 2))
            self.screen.blit(win_text, text_rect)
        
        # Draw help screen on top if active
        self.help_screen.draw(self.screen)
        
        # Update display
        pygame.display.flip()
        
    def render_startup_message(self):
        """Render the startup message with game instructions"""
        # Title
        title_font = pygame.font.SysFont(None, 72)
        title_text = title_font.render("SPACE INVADERS", True, (50, 255, 50))
        title_rect = title_text.get_rect(centerx=self.width // 2, top=80)
        self.screen.blit(title_text, title_rect)
        
        # Description
        desc_font = pygame.font.SysFont(None, 36)
        desc_text = desc_font.render("Enhanced Edition", True, (200, 200, 200))
        desc_rect = desc_text.get_rect(centerx=self.width // 2, top=title_rect.bottom + 10)
        self.screen.blit(desc_text, desc_rect)
        
        # Instructions
        instruction_font = pygame.font.SysFont(None, 30)
        instructions = [
            "Use LEFT and RIGHT arrow keys to move",
            "Press SPACE to fire missiles",
            "Press H for help screen with detailed instructions",
            "Press 1, 2, or 3 to change difficulty level",
            "",
            "Each level features different alien types:",
            "Level 1: Scout ships - Basic enemies that take 1 hit to destroy",
            "Level 2: Armored ships - Tougher enemies with 2 hit points",
            "Level 3: Elite ships - Advanced enemies with shields and 3 hit points",
            "",
            "Collect power-ups to enhance your ship:",
            "Shield, Rapid Fire, Multi-Shot, Slow Time, and Extra Life",
            "",
            "Your goal is to destroy all aliens before they reach the bottom!"
        ]
        
        y_position = desc_rect.bottom + 50
        for instruction in instructions:
            # Highlight key points
            if instruction.startswith("Level") or instruction == "Collect power-ups to enhance your ship:":
                text_color = (255, 255, 100)  # Yellow highlights
            elif instruction == "":
                # Skip some space for empty lines
                y_position += 10
                continue
            else:
                text_color = (255, 255, 255)  # White text
                
            text = instruction_font.render(instruction, True, text_color)
            text_rect = text.get_rect(centerx=self.width // 2, top=y_position)
            self.screen.blit(text, text_rect)
            y_position += 35
        
        # Start prompt
        prompt_font = pygame.font.SysFont(None, 42)
        prompt_text = prompt_font.render("Press SPACE to Start", True, (0, 255, 255))
        prompt_rect = prompt_text.get_rect(centerx=self.width // 2, bottom=self.height - 100)
        
        # Make it blink
        if (pygame.time.get_ticks() // 500) % 2 == 0:
            self.screen.blit(prompt_text, prompt_rect)