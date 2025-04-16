import pygame
import random
import math

class BaseAlien:
    """Base class for all alien types"""
    def __init__(self, x, y, size=30):
        self.x = x
        self.y = y
        self.size = size
        self.speed = 1
        self.alive = True
        self.health = 1
        self.max_health = 1
        self.color = (255, 255, 255)  # Default color
        self.points = 10  # Default points value
    
    def move(self, direction, speed_multiplier=1.0):
        """Move the alien horizontally based on direction"""
        self.x += direction * self.speed * speed_multiplier
    
    def move_down(self, amount=10):
        """Move the alien down"""
        self.y += amount
    
    def take_damage(self, missile, damage=1):
        """Take damage from a missile hit, returns True if destroyed
        Base implementation just reduces health"""
        self.health -= damage
        
        # Check if destroyed
        if self.health <= 0:
            self.alive = False
            return True
        return False
    
    def check_collision(self, missile):
        """Check if the alien collides with a missile"""
        if not self.alive:
            return False
        
        # Simple circle collision detection
        distance = ((self.x - missile.x) ** 2 + (self.y - missile.y) ** 2) ** 0.5
        return distance < self.size // 2 + missile.width // 2
    
    def draw(self, screen):
        """Draw the alien - to be overridden by subclasses"""
        if not self.alive:
            return
            
        # Default implementation draws a simple circle
        pygame.draw.circle(screen, self.color, (self.x, self.y), self.size // 2)

class ScoutAlien(BaseAlien):
    """Level 1: Simple scout aliens that die in one hit"""
    def __init__(self, x, y, size=30, color=(255, 50, 50), speed=1):
        super().__init__(x, y, size)
        self.color = color  # Red by default
        self.health = 1
        self.max_health = 1
        self.speed = speed
        self.points = 10
    
    def draw(self, screen):
        if not self.alive:
            return
            
        # Draw the alien as a circle with antennae
        pygame.draw.circle(screen, self.color, (self.x, self.y), self.size // 2)
        
        # Draw antennae
        pygame.draw.line(screen, self.color, 
                       (self.x - self.size // 4, self.y - self.size // 2),
                       (self.x - self.size // 3, self.y - self.size), 2)
        pygame.draw.line(screen, self.color, 
                       (self.x + self.size // 4, self.y - self.size // 2),
                       (self.x + self.size // 3, self.y - self.size), 2)
    
    def take_damage(self, missile, damage=1):
        # Scouts are destroyed in one hit
        self.alive = False
        return True

class ArmoredAlien(BaseAlien):
    """Level 2: Armored aliens with protective plating that take 2 hits to destroy"""
    def __init__(self, x, y, size=30, color=(50, 100, 255), speed=1.5):
        super().__init__(x, y, size)
        self.color = color  # Blue by default
        self.armor_color = (min(255, color[0] + 50), min(255, color[1] + 50), min(255, color[2] + 50))  # Lighter version of main color
        self.health = 2
        self.max_health = 2
        self.speed = speed
        self.points = 15
        self.has_armor = True
        self.damage_side = None  # 'left', 'right', or None - indicates which side was hit
    
    def draw(self, screen):
        if not self.alive:
            return
            
        # Draw the base alien
        pygame.draw.circle(screen, self.color, (self.x, self.y), self.size // 2)
        
        # Draw armor if present
        if self.has_armor:
            # Draw armor plates on both sides
            if self.damage_side != 'left':
                # Left armor plate
                pygame.draw.arc(screen, self.armor_color, 
                              (self.x - self.size // 2, self.y - self.size // 2, 
                               self.size, self.size),
                              math.radians(90), math.radians(270), 3)
            
            if self.damage_side != 'right':
                # Right armor plate
                pygame.draw.arc(screen, self.armor_color, 
                              (self.x - self.size // 2, self.y - self.size // 2, 
                               self.size, self.size),
                              math.radians(270), math.radians(90), 3)
        
        # Draw antennae
        pygame.draw.line(screen, self.color, 
                       (self.x - self.size // 4, self.y - self.size // 2),
                       (self.x - self.size // 3, self.y - self.size), 2)
        pygame.draw.line(screen, self.color, 
                       (self.x + self.size // 4, self.y - self.size // 2),
                       (self.x + self.size // 3, self.y - self.size), 2)
    
    def take_damage(self, missile, damage=1):
        # Determine which side was hit
        if missile.x < self.x:
            self.damage_side = 'left'
        else:
            self.damage_side = 'right'
        
        # First hit breaks armor, second hit destroys
        if self.has_armor:
            self.has_armor = False
            self.health -= damage
            return False
        else:
            self.alive = False
            return True

class EliteAlien(BaseAlien):
    """Level 3: Elite aliens with shields and reinforced hulls that take 3 hits to destroy"""
    def __init__(self, x, y, size=35, color=(50, 255, 50), speed=2):
        super().__init__(x, y, size)
        self.color = color  # Green by default
        # Create shield color as semi-transparent version of main color
        self.shield_color = (color[0], min(255, color[1] + 50), color[2], 150)
        # Create darker hull color from main color
        self.hull_color = (max(0, color[0] - 20), max(0, color[1] - 75), max(0, color[2] - 20))
        self.core_color = (255, 200, 0)  # Yellow/orange for core
        self.health = 3
        self.max_health = 3
        self.speed = speed
        self.points = 20
        
        # Component states
        self.has_shield = True
        self.hull_intact = True
        # Shield pulsing effect
        self.shield_size = self.size // 2 + 5
        self.shield_pulse_speed = 0.1
        self.shield_time = random.random() * 10  # Random starting phase
    
    def draw(self, screen):
        if not self.alive:
            return
        
        # Draw the base structure based on health state
        if self.hull_intact:
            # Intact hull
            pygame.draw.circle(screen, self.hull_color, (self.x, self.y), self.size // 2)
            
            # Draw hull details
            pygame.draw.line(screen, self.color, 
                           (self.x - self.size // 3, self.y),
                           (self.x + self.size // 3, self.y), 2)
            pygame.draw.line(screen, self.color, 
                           (self.x, self.y - self.size // 3),
                           (self.x, self.y + self.size // 3), 2)
        else:
            # Damaged hull, exposed core
            pygame.draw.circle(screen, self.hull_color, (self.x, self.y), self.size // 2)
            pygame.draw.circle(screen, self.core_color, (self.x, self.y), self.size // 3)
            
            # Draw damage effects (cracks)
            crack_angles = [30, 150, 270]
            for angle in crack_angles:
                start_x = self.x + int((self.size // 3) * math.cos(math.radians(angle)))
                start_y = self.y + int((self.size // 3) * math.sin(math.radians(angle)))
                end_x = self.x + int((self.size // 2) * math.cos(math.radians(angle)))
                end_y = self.y + int((self.size // 2) * math.sin(math.radians(angle)))
                pygame.draw.line(screen, (30, 30, 30), (start_x, start_y), (end_x, end_y), 2)
        
        # Draw shield if active
        if self.has_shield:
            # Update shield pulse effect
            self.shield_time += self.shield_pulse_speed
            pulse = math.sin(self.shield_time) * 2
            shield_radius = self.shield_size + pulse
            
            # Create a temporary surface with per-pixel alpha for the shield
            shield_surf = pygame.Surface((shield_radius * 2, shield_radius * 2), pygame.SRCALPHA)
            pygame.draw.circle(shield_surf, self.shield_color, 
                             (shield_radius, shield_radius), shield_radius)
            
            # Draw the shield
            screen.blit(shield_surf, 
                       (self.x - shield_radius, self.y - shield_radius))
    
    def take_damage(self, missile, damage=1):
        # Progressive damage: shield -> hull -> core
        if self.has_shield:
            # Shield absorbs the hit
            self.has_shield = False
            self.health -= damage
            return False
        elif self.hull_intact:
            # Hull is damaged
            self.hull_intact = False
            self.health -= damage
            return False
        else:
            # Core is hit, alien is destroyed
            self.alive = False
            return True
    
    def move(self, direction, speed_multiplier=1.0):
        # Elite aliens move slightly more erratically
        super().move(direction, speed_multiplier)
        # Small random y-axis drift
        self.y += random.uniform(-0.5, 0.5)