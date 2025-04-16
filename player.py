import pygame
from missile import Missile, MultiMissile
import math
import random

class Player:
    def __init__(self, screen_width, screen_height):
        # Player dimensions
        self.width = 40
        self.height = 30
        
        # Player position
        self.x = screen_width // 2
        self.y = screen_height - 80  # Positioned a bit higher from the bottom
        
        # Player speed
        self.speed = 5
        
        # Screen boundaries
        self.screen_width = screen_width
        self.screen_height = screen_height
        
        # Player color
        self.base_color = (50, 255, 50)  # Base green color
        self.color = self.base_color
        self.flame_color = (255, 150, 50)  # Engine flame color

        # Add current momentum tracking
        self.velocity = 0  # Current horizontal velocity
        self.max_speed = 5  # Maximum speed
        self.last_direction = 0  # Last movement direction
        
        # Player state
        self.lives = 3
        self.max_lives = 3
        self.is_invulnerable = False
        self.invulnerable_timer = 0
        self.invulnerable_duration = 120  # 2 seconds at 60fps
        self.is_damaged = False
        self.damage_timer = 0
        self.damage_flash_interval = 5
        
        # Player level/progression
        self.level = 1
        self.ship_upgrades = {
            1: {"color": (50, 255, 50), "width": 40, "height": 30},  # Basic
            2: {"color": (50, 200, 255), "width": 44, "height": 32},  # Enhanced
            3: {"color": (200, 100, 255), "width": 48, "height": 35}   # Advanced
        }
        
        # Power-up states
        self.has_shield = False
        self.shield_timer = 0
        self.shield_duration = 600  # 10 seconds at 60fps
        
        self.has_rapid_fire = False
        self.rapid_fire_timer = 0
        self.rapid_fire_duration = 600  # 10 seconds at 60fps
        self.fire_cooldown = 30  # 0.5 seconds between shots at 60fps
        self.rapid_fire_cooldown = 10  # Faster cooldown when powered up
        self.last_fire_time = 0
        
        self.has_multi_shot = False
        self.multi_shot_timer = 0
        self.multi_shot_duration = 600  # 10 seconds at 60fps
        
        self.has_slow_time = False
        self.slow_time_timer = 0
        self.slow_time_duration = 360  # 6 seconds at 60fps
        self.slow_time_factor = 0.5  # Aliens move at half speed
        
        # Visual effects
        self.thruster_animation = 0
        
        # Update visuals for current level
        self.update_ship_appearance()
    
    def update_ship_appearance(self):
        """Update ship appearance based on current level"""
        if self.level in self.ship_upgrades:
            upgrade = self.ship_upgrades[self.level]
            self.base_color = upgrade["color"]
            self.color = self.base_color
            self.width = upgrade["width"]
            self.height = upgrade["height"]
    
    def move_left(self):
        self.velocity = -self.max_speed
        self.last_direction = -1
        self.x += self.velocity
        
        # Ensure player stays within screen bounds
        if self.x < self.width // 2:
            self.x = self.width // 2
    
    def move_right(self):
        self.velocity = self.max_speed
        self.last_direction = 1
        self.x += self.velocity
        
        # Ensure player stays within screen bounds
        if self.x > self.screen_width - self.width // 2:
            self.x = self.screen_width - self.width // 2
    
    def stop_moving(self):
        self.velocity = 0
    
    def level_up(self):
        """Upgrade player ship for next level"""
        self.level += 1
        if self.level > 3:  # Don't exceed max level
            self.level = 3
        self.update_ship_appearance()
    
    def reset_level(self):
        """Reset player to level 1"""
        self.level = 1
        self.update_ship_appearance()
    
    def take_damage(self):
        """Player takes damage, loses a life"""
        if not self.is_invulnerable and not self.has_shield:
            self.lives -= 1
            self.is_damaged = True
            self.damage_timer = 60  # Show damage effect for 1 second
            if self.lives > 0:
                # Make player invulnerable briefly
                self.is_invulnerable = True
                self.invulnerable_timer = self.invulnerable_duration
            return True
        return False
    
    def add_life(self):
        """Add an extra life, up to the maximum"""
        if self.lives < self.max_lives:
            self.lives += 1
            return True
        return False
    
    def activate_shield(self):
        """Activate shield power-up"""
        self.has_shield = True
        self.shield_timer = self.shield_duration
    
    def activate_rapid_fire(self):
        """Activate rapid fire power-up"""
        self.has_rapid_fire = True
        self.rapid_fire_timer = self.rapid_fire_duration
    
    def activate_multi_shot(self):
        """Activate multi-shot power-up"""
        self.has_multi_shot = True
        self.multi_shot_timer = self.multi_shot_duration
        
    def activate_slow_time(self):
        """Activate slow time power-up"""
        self.has_slow_time = True
        self.slow_time_timer = self.slow_time_duration
    
    def update(self):
        """Update player state, power-ups, timers"""
        # Update invulnerability
        if self.is_invulnerable:
            self.invulnerable_timer -= 1
            if self.invulnerable_timer <= 0:
                self.is_invulnerable = False
        
        # Update damage effect
        if self.is_damaged:
            self.damage_timer -= 1
            # Flash between normal and damaged appearance
            if (self.damage_timer // self.damage_flash_interval) % 2 == 0:
                self.color = self.base_color
            else:
                self.color = (255, 100, 100)  # Damaged flash (red)
                
            if self.damage_timer <= 0:
                self.is_damaged = False
                self.color = self.base_color
        
        # Update shield power-up
        if self.has_shield:
            self.shield_timer -= 1
            if self.shield_timer <= 0:
                self.has_shield = False
        
        # Update rapid fire power-up
        if self.has_rapid_fire:
            self.rapid_fire_timer -= 1
            if self.rapid_fire_timer <= 0:
                self.has_rapid_fire = False
        
        # Update multi-shot power-up
        if self.has_multi_shot:
            self.multi_shot_timer -= 1
            if self.multi_shot_timer <= 0:
                self.has_multi_shot = False
                
        # Update slow-time power-up
        if self.has_slow_time:
            self.slow_time_timer -= 1
            if self.slow_time_timer <= 0:
                self.has_slow_time = False
        
        # Update thruster animation
        self.thruster_animation = (self.thruster_animation + 1) % 12
    
    def fire_missile(self):
        """Fire a missile or missiles based on power-ups"""
        # Only apply horizontal velocity to missiles when player is actively moving
        missile_velocity = self.velocity / 2
        
        # Check if enough time has passed since last fire
        current_time = pygame.time.get_ticks()
        cooldown = self.rapid_fire_cooldown if self.has_rapid_fire else self.fire_cooldown
        
        if current_time - self.last_fire_time < cooldown:
            return None
            
        self.last_fire_time = current_time
        
        # Different missile types based on power-ups
        if self.has_multi_shot:
            # Instead of returning MultiMissile, return list of individual missiles
            return [
                Missile(self.x - 15, self.y - self.height // 2, missile_velocity),
                Missile(self.x, self.y - self.height // 2 - 5, missile_velocity),
                Missile(self.x + 15, self.y - self.height // 2, missile_velocity)
            ]
        else:
            # Standard missile
            missile_type = "rapid" if self.has_rapid_fire else "standard"
            return Missile(self.x, self.y - self.height // 2, missile_velocity, missile_type=missile_type)
    
    def draw(self, screen):
        """Draw the player ship with all visual effects"""
        # Determine if we should draw (flash when invulnerable)
        should_draw = True
        if self.is_invulnerable and not self.is_damaged:  # Damage flash takes precedence
            should_draw = (self.invulnerable_timer // 4) % 2 == 0
        
        if should_draw:
            # Draw the ship body based on level
            if self.level == 1:
                # Basic triangular ship
                self.draw_basic_ship(screen)
            elif self.level == 2:
                # Enhanced ship with wings
                self.draw_enhanced_ship(screen)
            else:  # Level 3
                # Advanced ship with more complex shape
                self.draw_advanced_ship(screen)
            
            # Draw engine thrusters
            self.draw_thrusters(screen)
        
        # Draw shield if active (always visible)
        if self.has_shield:
            self.draw_shield(screen)
    
    def draw_basic_ship(self, screen):
        # Draw the player as a triangle
        points = [
            (self.x, self.y - self.height // 2),  # Top
            (self.x - self.width // 2, self.y + self.height // 2),  # Bottom left
            (self.x + self.width // 2, self.y + self.height // 2)   # Bottom right
        ]
        pygame.draw.polygon(screen, self.color, points)
        
        # Draw a small cannon on top
        pygame.draw.rect(
            screen, 
            self.color, 
            (self.x - 3, self.y - self.height // 2 - 10, 6, 10)
        )
    
    def draw_enhanced_ship(self, screen):
        # Draw enhanced ship (level 2) - more detailed with wings
        # Main body
        points = [
            (self.x, self.y - self.height // 2),  # Top
            (self.x - self.width // 4, self.y),  # Middle left
            (self.x - self.width // 2, self.y + self.height // 2),  # Bottom left
            (self.x + self.width // 2, self.y + self.height // 2),  # Bottom right
            (self.x + self.width // 4, self.y),  # Middle right
        ]
        pygame.draw.polygon(screen, self.color, points)
        
        # Wings
        wing_color = (self.color[0] - 30, self.color[1] - 30, self.color[2])
        left_wing = [
            (self.x - self.width // 4, self.y),
            (self.x - self.width // 2 - 10, self.y),
            (self.x - self.width // 3, self.y + self.height // 4)
        ]
        right_wing = [
            (self.x + self.width // 4, self.y),
            (self.x + self.width // 2 + 10, self.y),
            (self.x + self.width // 3, self.y + self.height // 4)
        ]
        pygame.draw.polygon(screen, wing_color, left_wing)
        pygame.draw.polygon(screen, wing_color, right_wing)
        
        # Enhanced cannon
        pygame.draw.rect(
            screen, 
            self.color, 
            (self.x - 4, self.y - self.height // 2 - 12, 8, 12)
        )
    
    def draw_advanced_ship(self, screen):
        # Draw advanced ship (level 3) - complex design with more details
        # Main body
        points = [
            (self.x, self.y - self.height // 2 - 5),  # Very top
            (self.x - self.width // 6, self.y - self.height // 2),  # Upper middle left
            (self.x - self.width // 3, self.y - self.height // 6),  # Middle left
            (self.x - self.width // 2, self.y + self.height // 3),  # Lower left
            (self.x, self.y + self.height // 2),  # Bottom
            (self.x + self.width // 2, self.y + self.height // 3),  # Lower right
            (self.x + self.width // 3, self.y - self.height // 6),  # Middle right
            (self.x + self.width // 6, self.y - self.height // 2),  # Upper middle right
        ]
        pygame.draw.polygon(screen, self.color, points)
        
        # Wing details
        detail_color = (min(255, self.color[0] + 50), min(255, self.color[1] + 50), min(255, self.color[2] + 50))
        pygame.draw.line(screen, detail_color, 
                        (self.x - self.width // 3, self.y - self.height // 6),
                        (self.x - self.width // 2 - 10, self.y - self.height // 8), 2)
        pygame.draw.line(screen, detail_color, 
                        (self.x + self.width // 3, self.y - self.height // 6),
                        (self.x + self.width // 2 + 10, self.y - self.height // 8), 2)
        
        # Advanced cannon system
        pygame.draw.rect(
            screen, 
            detail_color, 
            (self.x - 6, self.y - self.height // 2 - 15, 12, 15)
        )
        # Side cannons
        pygame.draw.rect(
            screen,
            detail_color,
            (self.x - self.width // 3, self.y - self.height // 6 - 8, 4, 8)
        )
        pygame.draw.rect(
            screen,
            detail_color,
            (self.x + self.width // 3 - 4, self.y - self.height // 6 - 8, 4, 8)
        )
    
    def draw_thrusters(self, screen):
        # Calculate flame height based on animation frame and velocity
        flame_height = 8 + abs(self.velocity) // 2 + (self.thruster_animation // 4)
        
        # Main engine flame
        flame_points = [
            (self.x - 8, self.y + self.height // 2),  # Left base
            (self.x + 8, self.y + self.height // 2),  # Right base
            (self.x, self.y + self.height // 2 + flame_height)  # Bottom tip
        ]
        pygame.draw.polygon(screen, self.flame_color, flame_points)
        
        # Inner flame (yellow)
        inner_flame_points = [
            (self.x - 4, self.y + self.height // 2),  # Left base
            (self.x + 4, self.y + self.height // 2),  # Right base
            (self.x, self.y + self.height // 2 + flame_height - 4)  # Bottom tip
        ]
        pygame.draw.polygon(screen, (255, 255, 0), inner_flame_points)
    
    def draw_shield(self, screen):
        # Draw shield as a pulsing circle around the ship
        shield_radius = self.width // 2 + 10 + (math.sin(pygame.time.get_ticks() * 0.01) * 2)
        
        # Create a surface with per-pixel alpha for transparency
        shield_surf = pygame.Surface((shield_radius * 2, shield_radius * 2), pygame.SRCALPHA)
        
        # Calculate shield fade based on remaining time
        alpha = min(180, 100 + self.shield_timer / self.shield_duration * 80)
        shield_color = (100, 200, 255, alpha)
        
        # Draw shield circle
        pygame.draw.circle(shield_surf, shield_color, (shield_radius, shield_radius), shield_radius)
        
        # Draw shield border for better visibility
        pygame.draw.circle(shield_surf, (shield_color[0], shield_color[1], shield_color[2], alpha + 40), 
                        (shield_radius, shield_radius), shield_radius, 2)
        
        # Blit the shield surface onto the screen
        screen.blit(shield_surf, (self.x - shield_radius, self.y - shield_radius))
    
    def draw_lives(self, screen, x, y, spacing=30):
        """Draw remaining lives indicators"""
        for i in range(self.lives):
            # Draw miniature version of the player ship
            mini_width = 20
            mini_height = 15
            mini_x = x + i * spacing
            mini_y = y
            
            # Simple triangle for the mini ship
            points = [
                (mini_x, mini_y - mini_height // 2),  # Top
                (mini_x - mini_width // 2, mini_y + mini_height // 2),  # Bottom left
                (mini_x + mini_width // 2, mini_y + mini_height // 2)   # Bottom right
            ]
            pygame.draw.polygon(screen, self.base_color, points)