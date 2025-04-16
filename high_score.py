import os
import json

class HighScoreManager:
    def __init__(self, filename="high_scores.json"):
        self.filename = filename
        self.high_scores = []
        self.load_scores()
    
    def load_scores(self):
        """Load high scores from file"""
        try:
            if os.path.exists(self.filename):
                with open(self.filename, 'r') as file:
                    self.high_scores = json.load(file)
            else:
                # Initialize with default empty list
                self.high_scores = []
                self.save_scores()
        except Exception as e:
            print(f"Error loading high scores: {e}")
            self.high_scores = []
    
    def save_scores(self):
        """Save high scores to file"""
        try:
            with open(self.filename, 'w') as file:
                json.dump(self.high_scores, file)
        except Exception as e:
            print(f"Error saving high scores: {e}")
    
    def add_score(self, name, score, difficulty, level_reached):
        """Add a new score to the high scores list"""
        new_score = {
            "name": name,
            "score": score,
            "difficulty": difficulty,
            "level_reached": level_reached,
            "date": get_current_date_string()
        }
        
        # Add the new score
        self.high_scores.append(new_score)
        
        # Sort high scores by score (highest first)
        self.high_scores.sort(key=lambda x: x["score"], reverse=True)
        
        # Keep only the top 10 scores
        self.high_scores = self.high_scores[:10]
        
        # Save to file
        self.save_scores()
        
        # Return position in high score list (0-based)
        return self.get_score_position(score)
    
    def get_score_position(self, score):
        """Get the position of a score in the high scores list"""
        for i, high_score in enumerate(self.high_scores):
            if score >= high_score["score"]:
                return i
        return len(self.high_scores)
    
    def is_high_score(self, score):
        """Check if a score qualifies for the high scores list"""
        if len(self.high_scores) < 10:
            return True
            
        return score > self.high_scores[-1]["score"]
    
    def get_top_scores(self, count=10):
        """Get the top N high scores"""
        return self.high_scores[:count]
    
    def clear_scores(self):
        """Clear all high scores"""
        self.high_scores = []
        self.save_scores()

def get_current_date_string():
    """Get the current date as a string"""
    from datetime import datetime
    return datetime.now().strftime("%Y-%m-%d")