import pygame
import random

class Alien:
    def __init__(self, x, y, size=30, color=(255, 50, 50), speed=1, health=1):
        self.x = x
        self.y = y
        self.size = size
        self.speed = speed
        self.color = color
        self.alive = True
        
        # Health and degradation
        self.max_health = health
        self.health = health
        self.last_hit_side = None  # 'left', 'right', or None
        self.degradation_stages = {}  # Visual states for different health levels
    
    def move(self, direction):
        # Move the alien horizontally based on direction
        self.x += direction * self.speed
    
    def move_down(self, amount=10):
        # Move the alien down
        self.y += amount
    
    def draw(self, screen):
        if not self.alive:
            return
        
        # Base shape - a circle with antennae
        pygame.draw.circle(screen, self.color, (self.x, self.y), self.size // 2)
        
        # Draw antennae if they aren't damaged
        if self.last_hit_side != 'left':
            pygame.draw.line(screen, self.color, 
                           (self.x - self.size // 4, self.y - self.size // 2),
                           (self.x - self.size // 3, self.y - self.size), 2)
        
        if self.last_hit_side != 'right':
            pygame.draw.line(screen, self.color, 
                           (self.x + self.size // 4, self.y - self.size // 2),
                           (self.x + self.size // 3, self.y - self.size), 2)
        
        # Draw degradation effects based on health
        self.draw_degradation(screen)
    
    def draw_degradation(self, screen):
        # Draw visual damage based on health ratio
        health_ratio = self.health / self.max_health
        
        if health_ratio < 1.0:
            # Draw cracks or damage marks
            crack_color = (40, 40, 40)  # Dark color for cracks
            
            if health_ratio < 0.66:
                # More damaged - draw more cracks
                start_angle = random.randint(0, 360)  # Random crack pattern
                for i in range(3):
                    angle = (start_angle + i * 120) % 360
                    end_x = self.x + int(self.size * 0.4 * math.cos(math.radians(angle)))
                    end_y = self.y + int(self.size * 0.4 * math.sin(math.radians(angle)))
                    pygame.draw.line(screen, crack_color, (self.x, self.y), (end_x, end_y), 2)
            
            if health_ratio < 0.33:
                # Severely damaged - add more visual indicators
                # Draw a damaged core
                pygame.draw.circle(screen, (255, 100, 0), (self.x, self.y), self.size // 4)
    
    def take_damage(self, missile, damage=1):
        """Take damage from a missile hit, returns True if destroyed"""
        # Determine which side was hit
        if missile.x < self.x:
            self.last_hit_side = 'left'
        else:
            self.last_hit_side = 'right'
        
        # Reduce health
        self.health -= damage
        
        # Check if destroyed
        if self.health <= 0:
            self.alive = False
            return True
        return False
    
    def check_collision(self, missile):
        if not self.alive:
            return False
        
        # Simple circle collision detection
        distance = ((self.x - missile.x) ** 2 + (self.y - missile.y) ** 2) ** 0.5
        return distance < self.size // 2 + missile.width // 2

# Import needed modules
import math