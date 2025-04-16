import pygame

class HelpScreen:
    def __init__(self, screen_width, screen_height):
        self.width = screen_width
        self.height = screen_height
        self.active = False
        
        # Colors
        self.bg_color = (0, 0, 50)  # Dark blue background
        self.title_color = (255, 255, 0)  # Yellow title
        self.text_color = (200, 200, 200)  # Light gray text
        self.highlight_color = (0, 255, 255)  # Cyan highlights
        
        # Fonts
        self.title_font = pygame.font.SysFont(None, 48)
        self.heading_font = pygame.font.SysFont(None, 36)
        self.text_font = pygame.font.SysFont(None, 24)
    
    def toggle(self):
        """Toggle help screen visibility"""
        self.active = not self.active
        return self.active
    
    def draw(self, screen):
        """Draw the help screen"""
        if not self.active:
            return
            
        # Semi-transparent background
        overlay = pygame.Surface((self.width, self.height), pygame.SRCALPHA)
        overlay.fill((0, 0, 50, 230))  # Dark blue with alpha
        screen.blit(overlay, (0, 0))
        
        # Title
        title = self.title_font.render("SPACE INVADERS - HELP", True, self.title_color)
        title_rect = title.get_rect(centerx=self.width // 2, top=20)
        screen.blit(title, title_rect)
        
        # Controls section
        controls_heading = self.heading_font.render("CONTROLS", True, self.highlight_color)
        screen.blit(controls_heading, (50, 80))
        
        control_texts = [
            "LEFT ARROW: Move ship left",
            "RIGHT ARROW: Move ship right",
            "SPACE: Fire missile",
            "H: Toggle help screen",
            "1, 2, 3: Change difficulty (Easy, Normal, Hard)",
            "R: Restart game (when game over)"
        ]
        
        y_pos = 120
        for text in control_texts:
            control_text = self.text_font.render(text, True, self.text_color)
            screen.blit(control_text, (70, y_pos))
            y_pos += 30
        
        # Alien Types section
        aliens_heading = self.heading_font.render("ALIEN TYPES", True, self.highlight_color)
        screen.blit(aliens_heading, (50, 300))
        
        alien_texts = [
            "LEVEL 1 - Red Scouts: Basic aliens that die in one hit",
            "LEVEL 2 - Blue Armored: Tougher aliens with protective plating (2 hits)",
            "LEVEL 3 - Elite Command: Advanced aliens with shields (3 hits)"
        ]
        
        y_pos = 340
        for text in alien_texts:
            alien_text = self.text_font.render(text, True, self.text_color)
            screen.blit(alien_text, (70, y_pos))
            y_pos += 30
        
        # Power-ups section
        powerups_heading = self.heading_font.render("POWER-UPS", True, self.highlight_color)
        screen.blit(powerups_heading, (50, 450))
        
        powerup_texts = [
            "SHIELD: Protects your ship from damage",
            "RAPID FIRE: Increases your firing rate",
            "MULTI-SHOT: Fires three missiles at once",
            "EXTRA LIFE: Gives you an additional life",
            "SLOW TIME: Slows down enemy movement"
        ]
        
        y_pos = 490
        for text in powerup_texts:
            powerup_text = self.text_font.render(text, True, self.text_color)
            screen.blit(powerup_text, (70, y_pos))
            y_pos += 30
        
        # Exit prompt
        exit_text = self.text_font.render("Press H to return to game", True, self.title_color)
        exit_rect = exit_text.get_rect(centerx=self.width // 2, bottom=self.height - 20)
        screen.blit(exit_text, exit_rect)