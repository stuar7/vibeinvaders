import pygame
import random
from alien import Alien

class BasicAlien(Alien):
    """Standard alien - similar to the original alien class"""
    def __init__(self, x, y, size=30, color=(255, 50, 50), speed=1):
        super().__init__(x, y, size, color, speed)
        self.type = "basic"
        self.health = 1
        self.points = 10
    
class ShieldedAlien(Alien):
    """Alien with a shield that requires two hits to destroy"""
    def __init__(self, x, y, size=30, color=(50, 50, 255), speed=1):
        super().__init__(x, y, size, color, speed)
        self.type = "shielded"
        self.health = 2
        self.points = 20
        self.shield_color = (200, 200, 255)
        self.has_shield = True
    
    def draw(self, screen):
        if self.alive:
            # Draw the alien body
            pygame.draw.circle(screen, self.color, (self.x, self.y), self.size // 2)
            
            # Draw antennae
            pygame.draw.line(screen, self.color, 
                           (self.x - self.size // 4, self.y - self.size // 2),
                           (self.x - self.size // 3, self.y - self.size), 2)
            pygame.draw.line(screen, self.color, 
                           (self.x + self.size // 4, self.y - self.size // 2),
                           (self.x + self.size // 3, self.y - self.size), 2)
            
            # Draw shield if it has one
            if self.has_shield:
                pygame.draw.circle(screen, self.shield_color, (self.x, self.y), 
                                 self.size // 2 + 5, 2)  # Outer circle with width 2
    
    def take_damage(self, amount=1):
        """Handle taking damage, destroying shield first"""
        self.health -= amount
        if self.health == 1:
            self.has_shield = False
        return self.health <= 0  # Return True if destroyed

class FastAlien(Alien):
    """Alien that moves more quickly and erratically"""
    def __init__(self, x, y, size=25, color=(255, 255, 50), speed=2):
        super().__init__(x, y, size, color, speed)
        self.type = "fast"
        self.health = 1
        self.points = 15
        self.y_offset = 0
        self.wobble_speed = random.uniform(0.1, 0.2)
        self.wobble_amount = random.randint(5, 15)
    
    def move(self, direction):
        # Move horizontally faster than normal aliens
        self.x += direction * self.speed
        
        # Add a slight up and down wobble
        self.y_offset = self.wobble_amount * math.sin(pygame.time.get_ticks() * self.wobble_speed)
    
    def draw(self, screen):
        if self.alive:
            # Draw with wobble offset
            pos = (self.x, self.y + self.y_offset)
            
            # Draw triangular fast alien
            points = [
                (self.x, self.y + self.y_offset - self.size // 2),  # Top
                (self.x - self.size // 2, self.y + self.y_offset + self.size // 2),  # Bottom left
                (self.x + self.size // 2, self.y + self.y_offset + self.size // 2)   # Bottom right
            ]
            pygame.draw.polygon(screen, self.color, points)

class BomberAlien(Alien):
    """Alien that occasionally drops bombs"""
    def __init__(self, x, y, size=35, color=(255, 100, 0), speed=0.8):
        super().__init__(x, y, size, color, speed)
        self.type = "bomber"
        self.health = 1
        self.points = 25
        self.bomb_chance = 0.005  # 0.5% chance per frame to drop a bomb
        self.last_bomb_time = 0
        self.bomb_cooldown = 3000  # 3 seconds between bombs
    
    def can_drop_bomb(self):
        """Check if this alien can drop a bomb this frame"""
        current_time = pygame.time.get_ticks()
        if current_time - self.last_bomb_time > self.bomb_cooldown:
            if random.random() < self.bomb_chance:
                self.last_bomb_time = current_time
                return True
        return False
    
    def draw(self, screen):
        if self.alive:
            # Draw the alien as a circle with a bomb-like shape
            pygame.draw.circle(screen, self.color, (self.x, self.y), self.size // 2)
            
            # Draw a fuse
            pygame.draw.line(screen, (100, 100, 100), 
                           (self.x, self.y - self.size // 2),
                           (self.x, self.y - self.size), 2)
            pygame.draw.circle(screen, (255, 255, 0), 
                            (self.x, self.y - self.size), 3)

# Import math module for FastAlien's movement
import math