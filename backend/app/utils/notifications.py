import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import logging
from typing import List, Optional
import os
from dotenv import load_dotenv
from sqlalchemy.orm import Session

from app.models import Chemical, Stock, Alert, User

load_dotenv()

logger = logging.getLogger(__name__)

class NotificationService:
    def __init__(self):
        self.smtp_server = os.getenv("SMTP_SERVER", "smtp.gmail.com")
        self.smtp_port = int(os.getenv("SMTP_PORT", "587"))
        self.smtp_username = os.getenv("SMTP_USERNAME")
        self.smtp_password = os.getenv("SMTP_PASSWORD")
        self.from_email = os.getenv("SMTP_USERNAME", "noreply@smartchemview.com")
    
    def send_low_stock_alert(self, chemical: Chemical, stock: Stock, recipients: List[str]) -> bool:
        """Send low stock alert email"""
        subject = f"🚨 Low Stock Alert: {chemical.name}"
        
        # Create email content
        body = f"""
        <html>
        <body>
            <h2>Low Stock Alert</h2>
            <p>The following chemical is running low on stock:</p>
            
            <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0;">
                <h3>{chemical.name}</h3>
                <p><strong>CAS Number:</strong> {chemical.cas_number}</p>
                <p><strong>Current Stock:</strong> {stock.current_quantity} {stock.unit}</p>
                <p><strong>Trigger Level:</strong> {stock.trigger_level} {stock.unit}</p>
                <p><strong>Molecular Formula:</strong> {chemical.molecular_formula or 'N/A'}</p>
            </div>
            
            <p>Please consider reordering this chemical soon.</p>
            
            <hr>
            <p style="color: #666; font-size: 12px;">
                This is an automated alert from ReyChemIQ System.
            </p>
        </body>
        </html>
        """
        
        return self._send_email(recipients, subject, body)
    
    def send_daily_stock_report(self, low_stock_chemicals: List[tuple], recipients: List[str]) -> bool:
        """Send daily stock summary report"""
        subject = "📊 Daily Chemical Stock Report"
        
        low_stock_count = len(low_stock_chemicals)
        
        body = f"""
        <html>
        <body>
            <h2>Daily Chemical Stock Report</h2>
            
            <div style="margin: 20px 0;">
                <h3>Stock Summary</h3>
                <p><strong>Chemicals with Low Stock:</strong> {low_stock_count}</p>
            </div>
        """
        
        if low_stock_chemicals:
            body += """
            <h3>Low Stock Chemicals</h3>
            <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
                <thead>
                    <tr style="background-color: #f8f9fa;">
                        <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Chemical</th>
                        <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">CAS</th>
                        <th style="padding: 10px; border: 1px solid #ddd; text-align: right;">Current Stock</th>
                        <th style="padding: 10px; border: 1px solid #ddd; text-align: right;">Trigger Level</th>
                    </tr>
                </thead>
                <tbody>
            """
            
            for chemical, stock in low_stock_chemicals:
                body += f"""
                    <tr>
                        <td style="padding: 10px; border: 1px solid #ddd;">{chemical.name}</td>
                        <td style="padding: 10px; border: 1px solid #ddd;">{chemical.cas_number}</td>
                        <td style="padding: 10px; border: 1px solid #ddd; text-align: right; color: #dc2626;">
                            {stock.current_quantity} {stock.unit}
                        </td>
                        <td style="padding: 10px; border: 1px solid #ddd; text-align: right;">
                            {stock.trigger_level} {stock.unit}
                        </td>
                    </tr>
                """
            
            body += """
                </tbody>
            </table>
            """
        
        body += """
            <hr>
            <p style="color: #666; font-size: 12px;">
                This is an automated daily report from ReyChemIQ System.
            </p>
        </body>
        </html>
        """
        
        return self._send_email(recipients, subject, body)
    
    def _send_email(self, recipients: List[str], subject: str, body: str) -> bool:
        """Send email using SMTP"""
        if not self.smtp_username or not self.smtp_password:
            logger.warning("SMTP credentials not configured. Email notification skipped.")
            return False
        
        try:
            # Create message
            msg = MIMEMultipart()
            msg['From'] = self.from_email
            msg['To'] = ", ".join(recipients)
            msg['Subject'] = subject
            
            # Add HTML body
            msg.attach(MIMEText(body, 'html'))
            
            # Connect to SMTP server and send
            with smtplib.SMTP(self.smtp_server, self.smtp_port) as server:
                server.starttls()
                server.login(self.smtp_username, self.smtp_password)
                server.send_message(msg)
            
            logger.info(f"Email sent successfully to {recipients}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send email: {e}")
            return False

# Global notification service instance
notification_service = NotificationService()

def check_and_notify_low_stock(db: Session, chemical_id: int):
    """Check stock level and send notifications if low"""
    from app.crud.stock_crud import get_stock
    from app.models import Chemical
    
    stock = get_stock(db, chemical_id)
    if not stock or stock.current_quantity > stock.trigger_level:
        return
    
    chemical = db.query(Chemical).filter(Chemical.id == chemical_id).first()
    if not chemical:
        return
    
    # Get admin users for notification
    admin_users = db.query(User).filter(User.role == 'admin', User.is_active == True).all()
    recipient_emails = [user.email for user in admin_users]
    
    if recipient_emails:
        notification_service.send_low_stock_alert(chemical, stock, recipient_emails)

def send_daily_stock_report(db: Session):
    """Send daily stock report to all admin users"""
    from app.crud.stock_crud import get_all_stock
    
    # Get low stock chemicals
    all_stock = get_all_stock(db)
    low_stock_chemicals = []
    
    for stock in all_stock:
        if stock.current_quantity <= stock.trigger_level:
            chemical = db.query(Chemical).filter(Chemical.id == stock.chemical_id).first()
            if chemical:
                low_stock_chemicals.append((chemical, stock))
    
    # Get admin recipients
    admin_users = db.query(User).filter(User.role == 'admin', User.is_active == True).all()
    recipient_emails = [user.email for user in admin_users]
    
    if recipient_emails and low_stock_chemicals:
        notification_service.send_daily_stock_report(low_stock_chemicals, recipient_emails)
